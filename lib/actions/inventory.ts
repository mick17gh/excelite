"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { InventoryCategory, UnitType, StockMovementType } from "@/lib/generated/prisma/client";
import { logCreate, logTransfer } from "@/lib/services/audit";

export interface CreateInventoryItemInput {
  name: string;
  sku: string;
  category: InventoryCategory;
  unit: UnitType;
  unitCost: number;
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
        currentStock: 0,
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

export async function getInventoryItems(branchId?: string) {
  try {
    const items = await db.inventoryItem.findMany({
      where: {
        deletedAt: null,
        ...(branchId && { branchId }),
      },
      include: {
        branch: true,
      },
      orderBy: { name: "asc" },
    });

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

    return { success: true, data: convertedItems };
  } catch (error) {
    console.error("[getInventoryItems] Error:", error);
    return { success: false, error: "Failed to fetch inventory items", data: [] };
  }
}

export interface RecordInboundInput {
  branchId: string;
  itemId: string;
  supplierId: string;
  quantity: number;
  unitCost: number;
  invoiceNumber?: string;
  notes?: string;
  receivedBy?: string;
}

export async function recordInbound(input: RecordInboundInput) {
  try {
    const totalCost = input.quantity * input.unitCost;

    // Create inbound record
    const inbound = await db.inboundStock.create({
      data: {
        branchId: input.branchId,
        itemId: input.itemId,
        supplierId: input.supplierId,
        quantity: input.quantity,
        unitCost: input.unitCost,
        totalCost,
        invoiceNumber: input.invoiceNumber,
        notes: input.notes,
        receivedBy: input.receivedBy,
        deliveryDate: new Date(),
      },
    });

    // Update inventory stock
    await db.inventoryItem.update({
      where: { id: input.itemId },
      data: {
        currentStock: { increment: input.quantity },
        lastRestockDate: new Date(),
      },
    });

    // Create audit log
    await logCreate(
      "InboundStock",
      inbound.id,
      {
        itemId: input.itemId,
        branchId: input.branchId,
        quantity: input.quantity,
        unitCost: input.unitCost,
        totalCost,
        supplierId: input.supplierId,
      }
    );

    revalidatePath("/dashboard/inventory");
    return { success: true, data: inbound };
  } catch (error) {
    console.error("[recordInbound] Error:", error);
    return { success: false, error: "Failed to record inbound stock" };
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
    return { success: true, data: outbound };
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
    return { success: true, data: wasteLog };
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
  approvedBy?: string;
}

export async function transferStock(input: TransferStockInput) {
  try {
    // Get item to get unit cost
    const item = await db.inventoryItem.findUnique({
      where: { id: input.itemId },
    });

    if (!item) {
      return { success: false, error: "Item not found" };
    }

    const totalCost = input.quantity * Number(item.unitCost);

    // Create transfer log
    const transfer = await db.transferLog.create({
      data: {
        fromBranchId: input.fromBranchId,
        toBranchId: input.toBranchId,
        itemId: input.itemId,
        quantity: input.quantity,
        unitCost: item.unitCost,
        totalCost,
        transferDate: new Date(),
        approvedBy: input.approvedBy,
        notes: input.notes,
        status: "COMPLETED",
      },
    });

    // Update source branch stock
    await db.inventoryItem.updateMany({
      where: { sku: item.sku, branchId: input.fromBranchId },
      data: { currentStock: { decrement: input.quantity } },
    });

    // Find or create item in destination branch
    const destItem = await db.inventoryItem.findFirst({
      where: { sku: item.sku, branchId: input.toBranchId },
    });

    if (destItem) {
      await db.inventoryItem.update({
        where: { id: destItem.id },
        data: { currentStock: { increment: input.quantity } },
      });
    } else {
      await db.inventoryItem.create({
        data: {
          name: item.name,
          sku: `${item.sku}-${input.toBranchId.slice(-4)}`,
          category: item.category,
          unit: item.unit,
          unitCost: item.unitCost,
          currentStock: input.quantity,
          minStock: item.minStock,
          maxStock: item.maxStock,
          reorderPoint: item.reorderPoint,
          branchId: input.toBranchId,
          isActive: true,
        },
      });
    }

    // Create audit log
    await logTransfer(
      "InventoryItem",
      input.itemId,
      {
        fromBranchId: input.fromBranchId,
        toBranchId: input.toBranchId,
        quantity: input.quantity,
        totalCost,
        transferId: transfer.id,
      }
    );

    revalidatePath("/dashboard/inventory");
    return { success: true, data: transfer };
  } catch (error) {
    console.error("[transferStock] Error:", error);
    return { success: false, error: "Failed to transfer stock" };
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
