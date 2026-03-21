"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { InventoryCategory, UnitType, StockMovementType, TransferStatus } from "@/lib/generated/prisma/client";
import { logCreate, logTransfer } from "@/lib/services/audit";

export interface CreateInventoryItemInput {
  name: string;
  sku: string;
  category: InventoryCategory;
  unit: UnitType;
  unitCost: number;
  currentStock?: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  branchId: string;
}

export interface UpdateInventoryItemInput {
  id: string;
  name?: string;
  category?: InventoryCategory;
  unit?: UnitType;
  unitCost?: number;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  isActive?: boolean;
}

export async function createInventoryItem(input: CreateInventoryItemInput) {
  try {
    const item = await db.inventoryItem.create({
      data: {
        name: input.name,
        sku: input.sku,
        category: input.category,
        unit: input.unit,
        unitCost: input.unitCost,
        minStock: input.minStock,
        maxStock: input.maxStock,
        reorderPoint: input.reorderPoint,
        branchId: input.branchId,
        currentStock: input.currentStock ?? 0,
        isActive: true,
      },
    });

    revalidatePath("/dashboard/inventory");
    return { 
      success: true, 
      data: {
        ...item,
        unitCost: Number(item.unitCost),
        currentStock: Number(item.currentStock),
        minStock: Number(item.minStock),
        maxStock: Number(item.maxStock),
        reorderPoint: Number(item.reorderPoint)
      }
    };
  } catch (error) {
    console.error("[createInventoryItem] Error:", error);
    return { success: false, error: "Failed to create inventory item" };
  }
}

export async function updateInventoryItem(input: UpdateInventoryItemInput) {
  try {
    const { id, ...data } = input;
    const item = await db.inventoryItem.update({
      where: { id },
      data,
    });

    revalidatePath("/dashboard/inventory");
    return { 
      success: true, 
      data: {
        ...item,
        unitCost: Number(item.unitCost),
        currentStock: Number(item.currentStock),
        minStock: Number(item.minStock),
        maxStock: Number(item.maxStock),
        reorderPoint: Number(item.reorderPoint)
      }
    };
  } catch (error) {
    console.error("[updateInventoryItem] Error:", error);
    return { success: false, error: "Failed to update inventory item" };
  }
}

export async function deleteInventoryItem(id: string) {
  try {
    await db.inventoryItem.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    revalidatePath("/dashboard/inventory");
    return { success: true };
  } catch (error) {
    console.error("[deleteInventoryItem] Error:", error);
    return { success: false, error: "Failed to delete inventory item" };
  }
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  error?: string;
}

export async function getInventoryItems(
  branchId?: string,
  pagination?: PaginationParams
): Promise<PaginatedResult<any>> {
  try {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where = {
      deletedAt: null,
      ...(branchId && { branchId }),
    };

    const [items, totalItems] = await Promise.all([
      db.inventoryItem.findMany({
        where,
        include: {
          branch: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
      }),
      db.inventoryItem.count({ where }),
    ]);

    // Convert Decimal fields to plain numbers
    const convertedItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      unitCost: Number(item.unitCost),
      currentStock: Number(item.currentStock),
      minStock: Number(item.minStock),
      maxStock: Number(item.maxStock),
      reorderPoint: Number(item.reorderPoint),
      branchId: item.branchId,
      isActive: item.isActive,
      lastRestockDate: item.lastRestockDate,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      deletedAt: item.deletedAt,
      branch: item.branch,
    }));

    return {
      success: true,
      data: convertedItems,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  } catch (error) {
    console.error("[getInventoryItems] Error:", error);
    return {
      success: false,
      error: "Failed to fetch inventory items",
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
    };
  }
}

export interface RecordOutboundInput {
  branchId: string;
  itemId: string;
  quantity: number;
  movementType: StockMovementType;
  reason?: string;
  reference?: string;
  createdBy?: string;
}

export async function recordOutbound(input: RecordOutboundInput) {
  try {
    // Create outbound record
    const outbound = await db.outboundStock.create({
      data: {
        branchId: input.branchId,
        itemId: input.itemId,
        quantity: input.quantity,
        movementType: input.movementType,
        reason: input.reason,
        reference: input.reference,
        createdBy: input.createdBy,
      },
    });

    // Update inventory stock
    await db.inventoryItem.update({
      where: { id: input.itemId },
      data: {
        currentStock: { decrement: input.quantity },
      },
    });

    revalidatePath("/dashboard/inventory");
    return { 
      success: true, 
      data: {
        ...outbound,
        quantity: Number(outbound.quantity),
      }
    };
  } catch (error) {
    console.error("[recordOutbound] Error:", error);
    return { success: false, error: "Failed to record outbound stock" };
  }
}

export interface RecordWasteInput {
  branchId: string;
  itemId: string;
  quantity: number;
  reason: string;
  notes?: string;
  recordedBy?: string;
}

export async function recordWaste(input: RecordWasteInput) {
  try {
    // Get item to calculate cost
    const item = await db.inventoryItem.findUnique({
      where: { id: input.itemId },
    });

    if (!item) {
      return { success: false, error: "Item not found" };
    }

    const totalCost = input.quantity * Number(item.unitCost);

    // Create waste log
    const wasteLog = await db.wasteLog.create({
      data: {
        branchId: input.branchId,
        itemId: input.itemId,
        quantity: input.quantity,
        unitCost: item.unitCost,
        totalCost,
        reason: input.reason,
        notes: input.notes,
        recordedBy: input.recordedBy,
        wasteDate: new Date(),
      },
    });

    // Update inventory stock
    await db.inventoryItem.update({
      where: { id: input.itemId },
      data: {
        currentStock: { decrement: input.quantity },
      },
    });

    // Create outbound record for waste
    await db.outboundStock.create({
      data: {
        branchId: input.branchId,
        itemId: input.itemId,
        quantity: input.quantity,
        movementType: "OUTBOUND_WASTE",
        reason: input.reason,
        reference: wasteLog.id,
      },
    });

    revalidatePath("/dashboard/inventory");
    return { 
      success: true, 
      data: {
        ...wasteLog,
        quantity: Number(wasteLog.quantity),
        unitCost: Number(wasteLog.unitCost),
        totalCost: Number(wasteLog.totalCost),
      }
    };
  } catch (error) {
    console.error("[recordWaste] Error:", error);
    return { success: false, error: "Failed to record waste" };
  }
}

export interface TransferStockInput {
  fromBranchId: string;
  toBranchId: string;
  itemId: string;
  quantity: number;
  notes?: string;
}

// Create a branch-to-branch transfer request (starts as PENDING)
export async function transferStock(input: TransferStockInput) {
  try {
    const item = await db.inventoryItem.findUnique({
      where: { id: input.itemId },
    });

    if (!item) {
      return { success: false, error: "Item not found" };
    }

    if (Number(item.currentStock) < input.quantity) {
      return { success: false, error: `Insufficient stock. Available: ${Number(item.currentStock)} ${item.unit}` };
    }

    if (input.fromBranchId === input.toBranchId) {
      return { success: false, error: "Source and destination branches must be different" };
    }

    const totalCost = input.quantity * Number(item.unitCost);

    const transfer = await db.transferLog.create({
      data: {
        fromBranchId: input.fromBranchId,
        toBranchId: input.toBranchId,
        itemId: input.itemId,
        quantity: input.quantity,
        unitCost: item.unitCost,
        totalCost,
        transferDate: new Date(),
        notes: input.notes,
        status: TransferStatus.PENDING,
      },
    });

    revalidatePath("/dashboard/inventory");
    return {
      success: true,
      data: {
        ...transfer,
        quantity: Number(transfer.quantity),
        unitCost: Number(transfer.unitCost),
        totalCost: Number(transfer.totalCost),
      },
    };
  } catch (error) {
    console.error("[transferStock] Error:", error);
    return { success: false, error: "Failed to create transfer request" };
  }
}

// Update branch transfer status (PENDING → IN_TRANSIT → COMPLETED / CANCELLED)
export async function updateBranchTransferStatus(
  transferId: string,
  status: TransferStatus,
  userId?: string
) {
  try {
    const transfer = await db.transferLog.findUnique({
      where: { id: transferId },
      include: { item: true },
    });

    if (!transfer) {
      return { success: false, error: "Transfer not found" };
    }

    const data: Record<string, unknown> = { status };

    if (status === "IN_TRANSIT") {
      data.approvedBy = userId || null;
    }

    if (status === "COMPLETED") {
      data.receivedBy = userId || null;

      const qty = Number(transfer.quantity);
      const item = transfer.item;

      // 1. Deduct from source branch
      await db.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: { decrement: qty } },
      });

      // 2. Find or create item in destination branch (use same SKU!)
      const destItem = await db.inventoryItem.findFirst({
        where: { sku: item.sku, branchId: transfer.toBranchId, deletedAt: null },
      });

      if (destItem) {
        await db.inventoryItem.update({
          where: { id: destItem.id },
          data: { currentStock: { increment: qty }, lastRestockDate: new Date() },
        });
      } else {
        await db.inventoryItem.create({
          data: {
            name: item.name,
            sku: item.sku,
            category: item.category,
            unit: item.unit,
            unitCost: item.unitCost,
            currentStock: qty,
            minStock: item.minStock,
            maxStock: item.maxStock,
            reorderPoint: item.reorderPoint,
            branchId: transfer.toBranchId,
            lastRestockDate: new Date(),
          },
        });
      }

      // 3. Audit log
      await logTransfer(
        "InventoryItem",
        item.id,
        {
          fromBranchId: transfer.fromBranchId,
          toBranchId: transfer.toBranchId,
          quantity: qty,
          totalCost: Number(transfer.totalCost),
          transferId: transfer.id,
        }
      );
    }

    await db.transferLog.update({ where: { id: transferId }, data });

    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/warehouse");
    return { success: true };
  } catch (error) {
    console.error("[updateBranchTransferStatus] Error:", error);
    return { success: false, error: "Failed to update transfer status" };
  }
}

export async function getSuppliers() {
  try {
    const suppliers = await db.supplier.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: suppliers };
  } catch (error) {
    console.error("[getSuppliers] Error:", error);
    return { success: false, error: "Failed to fetch suppliers", data: [] };
  }
}

export interface CreateSupplierInput {
  name: string;
  code: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export async function createSupplier(input: CreateSupplierInput) {
  try {
    const supplier = await db.supplier.create({
      data: {
        name: input.name,
        code: input.code,
        contactName: input.contactName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        isActive: true,
      },
    });

    revalidatePath("/dashboard/inventory");
    return { success: true, data: supplier };
  } catch (error) {
    console.error("[createSupplier] Error:", error);
    return { success: false, error: "Failed to create supplier" };
  }
}

// getInboundRecords removed - branches track warehouse transfers instead

export async function getOutboundRecords(
  branchId?: string,
  pagination?: PaginationParams
): Promise<PaginatedResult<any>> {
  try {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const skip = (page - 1) * pageSize;
    const where = branchId ? { branchId } : {};

    const [records, totalItems] = await Promise.all([
      db.outboundStock.findMany({
        where,
        include: {
          item: { select: { name: true, sku: true } },
          branch: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.outboundStock.count({ where }),
    ]);

    return {
      success: true,
      data: records.map(record => ({
        ...record,
        quantity: Number(record.quantity),
      })),
      pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  } catch (error) {
    console.error("[getOutboundRecords] Error:", error);
    return { success: false, error: "Failed to fetch outbound records", data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } };
  }
}

export async function getTransferRecords(
  branchId?: string,
  pagination?: PaginationParams
): Promise<PaginatedResult<any>> {
  try {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 100;
    const skip = (page - 1) * pageSize;
    const where = branchId ? { 
      OR: [
        { fromBranchId: branchId },
        { toBranchId: branchId }
      ]
    } : {};

    const [records, totalItems] = await Promise.all([
      db.transferLog.findMany({
        where,
        include: {
          item: { select: { name: true, sku: true } },
          fromBranch: { select: { name: true } },
          toBranch: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.transferLog.count({ where }),
    ]);

    return {
      success: true,
      data: records.map(record => ({
        ...record,
        quantity: Number(record.quantity),
        unitCost: Number(record.unitCost),
        totalCost: Number(record.totalCost),
      })),
      pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  } catch (error) {
    console.error("[getTransferRecords] Error:", error);
    return { success: false, error: "Failed to fetch transfer records", data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } };
  }
}

export async function getLowStockItems() {
  try {
    const items = await db.inventoryItem.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      include: {
        branch: true,
      },
    });

    const lowStock = items.filter(
      (item) => Number(item.currentStock) <= Number(item.reorderPoint)
    );

    // Convert Decimal fields to plain numbers
    const convertedItems = lowStock.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      unitCost: Number(item.unitCost),
      currentStock: Number(item.currentStock),
      minStock: Number(item.minStock),
      maxStock: Number(item.maxStock),
      reorderPoint: Number(item.reorderPoint),
      branchId: item.branchId,
      isActive: item.isActive,
      lastRestockDate: item.lastRestockDate,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      deletedAt: item.deletedAt,
      branch: item.branch,
    }));

    return { success: true, data: convertedItems };
  } catch (error) {
    console.error("[getLowStockItems] Error:", error);
    return { success: false, error: "Failed to fetch low stock items", data: [] };
  }
}
