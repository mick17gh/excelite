"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { InventoryCategory, UnitType, TransferStatus } from "@/lib/generated/prisma/client";

export interface CreateWarehouseInput {
  name: string;
  code: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
}

export interface UpdateWarehouseInput {
  id: string;
  name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

export interface CreateWarehouseItemInput {
  warehouseId: string;
  name: string;
  sku: string;
  category: InventoryCategory;
  unit: UnitType;
  unitCost: number;
  currentStock?: number;
  minStock?: number;
  reorderPoint?: number;
}

export interface CreateWarehouseTransferInput {
  warehouseId: string;
  warehouseItemId: string;
  toBranchId: string;
  quantity: number;
  notes?: string;
}

export async function getWarehouses(organizationId?: string) {
  try {
    const where: Record<string, unknown> = {};
    if (organizationId) where.organizationId = organizationId;

    const warehouses = await db.warehouse.findMany({
      where,
      include: {
        _count: { select: { inventory: true, transfersOut: true } },
        organization: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: warehouses.map((w) => ({
        id: w.id,
        name: w.name,
        code: w.code,
        address: w.address,
        city: w.city,
        phone: w.phone,
        email: w.email,
        organizationId: w.organizationId,
        organizationName: w.organization?.name || "",
        isActive: w.isActive,
        itemCount: w._count.inventory,
        transferCount: w._count.transfersOut,
        createdAt: w.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[getWarehouses] Error:", error);
    return { data: [] };
  }
}

export async function getWarehouseInventory(warehouseId: string) {
  try {
    const items = await db.warehouseInventoryItem.findMany({
      where: { warehouseId },
      orderBy: { name: "asc" },
    });

    return {
      data: items.map((item) => ({
        id: item.id,
        warehouseId: item.warehouseId,
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        unitCost: Number(item.unitCost),
        currentStock: Number(item.currentStock),
        minStock: Number(item.minStock),
        reorderPoint: Number(item.reorderPoint),
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[getWarehouseInventory] Error:", error);
    return { data: [] };
  }
}

export async function getWarehouseTransfers(warehouseId?: string) {
  try {
    const where: Record<string, unknown> = {};
    if (warehouseId) where.warehouseId = warehouseId;

    const transfers = await db.warehouseBranchTransfer.findMany({
      where,
      include: {
        warehouse: { select: { name: true, code: true } },
        warehouseItem: { select: { name: true, sku: true, unit: true } },
        toBranch: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return {
      data: transfers.map((t) => ({
        id: t.id,
        warehouseId: t.warehouseId,
        warehouseName: t.warehouse?.name || "",
        warehouseItemId: t.warehouseItemId,
        itemName: t.warehouseItem?.name || "",
        itemSku: t.warehouseItem?.sku || "",
        itemUnit: t.warehouseItem?.unit || "",
        toBranchId: t.toBranchId,
        toBranchName: t.toBranch?.name || "",
        quantity: Number(t.quantity),
        unitCost: Number(t.unitCost),
        totalCost: Number(t.totalCost),
        status: t.status,
        transferDate: t.transferDate.toISOString(),
        approvedBy: t.approvedBy,
        receivedBy: t.receivedBy,
        notes: t.notes,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[getWarehouseTransfers] Error:", error);
    return { data: [] };
  }
}

export async function createWarehouse(input: CreateWarehouseInput) {
  try {
    const existing = await db.warehouse.findUnique({ where: { code: input.code } });
    if (existing) {
      return { error: "A warehouse with this code already exists" };
    }

    // Get the organization ID (assuming single org setup)
    const org = await db.organization.findFirst();
    if (!org) {
      return { error: "No organization found. Please create an organization first." };
    }

    const warehouse = await db.warehouse.create({
      data: {
        name: input.name,
        code: input.code,
        address: input.address,
        city: input.city,
        phone: input.phone || null,
        email: input.email || null,
        organizationId: org.id,
      },
    });

    revalidatePath("/dashboard/warehouse");
    return { data: warehouse };
  } catch (error) {
    console.error("[createWarehouse] Error:", error);
    return { error: "Failed to create warehouse" };
  }
}

export async function updateWarehouse(input: UpdateWarehouseInput) {
  try {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.address !== undefined) data.address = input.address;
    if (input.city !== undefined) data.city = input.city;
    if (input.phone !== undefined) data.phone = input.phone || null;
    if (input.email !== undefined) data.email = input.email || null;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const warehouse = await db.warehouse.update({
      where: { id: input.id },
      data,
    });

    revalidatePath("/dashboard/warehouse");
    return { data: warehouse };
  } catch (error) {
    console.error("[updateWarehouse] Error:", error);
    return { error: "Failed to update warehouse" };
  }
}

export async function createWarehouseItem(input: CreateWarehouseItemInput) {
  try {
    const item = await db.warehouseInventoryItem.create({
      data: {
        warehouseId: input.warehouseId,
        name: input.name,
        sku: input.sku,
        category: input.category,
        unit: input.unit,
        unitCost: input.unitCost,
        currentStock: input.currentStock || 0,
        minStock: input.minStock || 0,
        reorderPoint: input.reorderPoint || 10,
      },
    });

    revalidatePath("/dashboard/warehouse");
    return { data: item };
  } catch (error) {
    console.error("[createWarehouseItem] Error:", error);
    return { error: "Failed to create warehouse item" };
  }
}

export async function createWarehouseTransfer(input: CreateWarehouseTransferInput) {
  try {
    const item = await db.warehouseInventoryItem.findUnique({ where: { id: input.warehouseItemId } });
    if (!item) return { error: "Warehouse item not found" };

    if (Number(item.currentStock) < input.quantity) {
      return { error: "Insufficient stock for transfer" };
    }

    const transfer = await db.warehouseBranchTransfer.create({
      data: {
        warehouseId: input.warehouseId,
        warehouseItemId: input.warehouseItemId,
        toBranchId: input.toBranchId,
        quantity: input.quantity,
        unitCost: Number(item.unitCost),
        totalCost: input.quantity * Number(item.unitCost),
        status: "PENDING",
        transferDate: new Date(),
        notes: input.notes || null,
      },
    });

    revalidatePath("/dashboard/warehouse");
    return { data: transfer };
  } catch (error) {
    console.error("[createWarehouseTransfer] Error:", error);
    return { error: "Failed to create transfer" };
  }
}

export async function updateTransferStatus(id: string, status: TransferStatus, userId?: string) {
  try {
    const data: Record<string, unknown> = { status };

    if (status === "COMPLETED") {
      data.receivedBy = userId || null;

      const transfer = await db.warehouseBranchTransfer.findUnique({
        where: { id },
        include: { warehouseItem: true },
      });

      if (transfer) {
        const qty = Number(transfer.quantity);
        const whItem = transfer.warehouseItem;

        // 1. Deduct warehouse stock
        await db.warehouseInventoryItem.update({
          where: { id: transfer.warehouseItemId },
          data: { currentStock: { decrement: qty } },
        });

        // 2. Find or create branch inventory item
        const branchItem = await db.inventoryItem.findFirst({
          where: { sku: whItem.sku, branchId: transfer.toBranchId },
        });

        if (branchItem) {
          await db.inventoryItem.update({
            where: { id: branchItem.id },
            data: { currentStock: { increment: qty }, lastRestockDate: new Date() },
          });
        } else {
          await db.inventoryItem.create({
            data: {
              name: whItem.name,
              sku: whItem.sku,
              category: whItem.category,
              unit: whItem.unit,
              unitCost: whItem.unitCost,
              currentStock: qty,
              minStock: Number(whItem.minStock),
              maxStock: Number(whItem.reorderPoint) * 5 || 100, // Use 5x reorder point as max, or 100 as fallback
              reorderPoint: Number(whItem.reorderPoint),
              branchId: transfer.toBranchId,
              lastRestockDate: new Date(),
            },
          });
        }
      }
    }

    const updated = await db.warehouseBranchTransfer.update({ where: { id }, data });

    revalidatePath("/dashboard/warehouse");
    revalidatePath("/dashboard/inventory");
    return { data: updated };
  } catch (error) {
    console.error("[updateTransferStatus] Error:", error);
    return { error: "Failed to update transfer status" };
  }
}

export async function getWarehouseStats() {
  try {
    const [totalWarehouses, totalItems, pendingTransfers, totalWastage] = await Promise.all([
      db.warehouse.count({ where: { isActive: true } }),
      db.warehouseInventoryItem.count({ where: { isActive: true } }),
      db.warehouseBranchTransfer.count({ where: { status: "PENDING" } }),
      db.warehouseWasteLog.count(),
    ]);

    return { data: { totalWarehouses, totalItems, pendingTransfers, totalWastage } };
  } catch (error) {
    console.error("[getWarehouseStats] Error:", error);
    return { data: { totalWarehouses: 0, totalItems: 0, pendingTransfers: 0, totalWastage: 0 } };
  }
}

// ============================================
// WAREHOUSE WASTAGE
// ============================================

export interface RecordWarehouseWasteInput {
  warehouseId: string;
  warehouseItemId: string;
  quantity: number;
  reason: string;
  notes?: string;
  recordedBy?: string;
}

export async function recordWarehouseWaste(input: RecordWarehouseWasteInput) {
  try {
    const item = await db.warehouseInventoryItem.findUnique({
      where: { id: input.warehouseItemId },
    });
    if (!item) return { error: "Warehouse item not found" };

    if (Number(item.currentStock) < input.quantity) {
      return { error: "Waste quantity exceeds current stock" };
    }

    const totalCost = input.quantity * Number(item.unitCost);

    const wasteLog = await db.warehouseWasteLog.create({
      data: {
        warehouseId: input.warehouseId,
        warehouseItemId: input.warehouseItemId,
        quantity: input.quantity,
        unitCost: item.unitCost,
        totalCost,
        reason: input.reason,
        notes: input.notes || null,
        recordedBy: input.recordedBy || null,
        wasteDate: new Date(),
      },
    });

    // Deduct from warehouse stock
    await db.warehouseInventoryItem.update({
      where: { id: input.warehouseItemId },
      data: { currentStock: { decrement: input.quantity } },
    });

    revalidatePath("/dashboard/warehouse");
    return {
      data: {
        ...wasteLog,
        quantity: Number(wasteLog.quantity),
        unitCost: Number(wasteLog.unitCost),
        totalCost: Number(wasteLog.totalCost),
      },
    };
  } catch (error) {
    console.error("[recordWarehouseWaste] Error:", error);
    return { error: "Failed to record warehouse waste" };
  }
}

export async function getWarehouseWasteLogs(warehouseId?: string) {
  try {
    const where: Record<string, unknown> = {};
    if (warehouseId) where.warehouseId = warehouseId;

    const logs = await db.warehouseWasteLog.findMany({
      where,
      include: {
        warehouseItem: { select: { name: true, sku: true, unit: true } },
        warehouse: { select: { name: true } },
      },
      orderBy: { wasteDate: "desc" },
      take: 200,
    });

    return {
      data: logs.map((l) => ({
        id: l.id,
        warehouseId: l.warehouseId,
        warehouseName: l.warehouse?.name || "",
        warehouseItemId: l.warehouseItemId,
        itemName: l.warehouseItem?.name || "",
        itemSku: l.warehouseItem?.sku || "",
        itemUnit: l.warehouseItem?.unit || "",
        quantity: Number(l.quantity),
        unitCost: Number(l.unitCost),
        totalCost: Number(l.totalCost),
        reason: l.reason,
        notes: l.notes,
        recordedBy: l.recordedBy,
        wasteDate: l.wasteDate.toISOString(),
        createdAt: l.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[getWarehouseWasteLogs] Error:", error);
    return { data: [] };
  }
}

// ============================================
// WAREHOUSE SUPPLIER INBOUND
// ============================================

export interface RecordWarehouseInboundInput {
  warehouseId: string;
  warehouseItemId: string;
  supplierId: string;
  quantity: number;
  unitCost: number;
  invoiceNumber?: string;
  notes?: string;
  receivedBy?: string;
}

export async function recordWarehouseInbound(input: RecordWarehouseInboundInput) {
  try {
    const totalCost = input.quantity * input.unitCost;

    const inbound = await db.warehouseInbound.create({
      data: {
        warehouseId: input.warehouseId,
        warehouseItemId: input.warehouseItemId,
        supplierId: input.supplierId,
        quantity: input.quantity,
        unitCost: input.unitCost,
        totalCost,
        invoiceNumber: input.invoiceNumber || null,
        notes: input.notes || null,
        receivedBy: input.receivedBy || null,
        deliveryDate: new Date(),
      },
    });

    // Increment warehouse stock
    await db.warehouseInventoryItem.update({
      where: { id: input.warehouseItemId },
      data: { currentStock: { increment: input.quantity } },
    });

    revalidatePath("/dashboard/warehouse");
    return {
      data: {
        ...inbound,
        quantity: Number(inbound.quantity),
        unitCost: Number(inbound.unitCost),
        totalCost: Number(inbound.totalCost),
      },
    };
  } catch (error) {
    console.error("[recordWarehouseInbound] Error:", error);
    return { error: "Failed to record warehouse inbound" };
  }
}

export async function getWarehouseInboundRecords(warehouseId?: string) {
  try {
    const where: Record<string, unknown> = {};
    if (warehouseId) where.warehouseId = warehouseId;

    const records = await db.warehouseInbound.findMany({
      where,
      include: {
        warehouseItem: { select: { name: true, sku: true, unit: true } },
        supplier: { select: { name: true } },
        warehouse: { select: { name: true } },
      },
      orderBy: { deliveryDate: "desc" },
      take: 200,
    });

    return {
      data: records.map((r) => ({
        id: r.id,
        warehouseId: r.warehouseId,
        warehouseName: r.warehouse?.name || "",
        warehouseItemId: r.warehouseItemId,
        itemName: r.warehouseItem?.name || "",
        itemSku: r.warehouseItem?.sku || "",
        itemUnit: r.warehouseItem?.unit || "",
        supplierId: r.supplierId,
        supplierName: r.supplier?.name || "",
        quantity: Number(r.quantity),
        unitCost: Number(r.unitCost),
        totalCost: Number(r.totalCost),
        invoiceNumber: r.invoiceNumber,
        notes: r.notes,
        receivedBy: r.receivedBy,
        deliveryDate: r.deliveryDate.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[getWarehouseInboundRecords] Error:", error);
    return { data: [] };
  }
}

// ============================================
// BULK IMPORT
// ============================================

export interface BulkWarehouseItemInput {
  name: string;
  sku: string;
  category: InventoryCategory;
  unit: UnitType;
  unitCost: number;
  currentStock?: number;
  minStock?: number;
  reorderPoint?: number;
}

export async function bulkCreateWarehouseItems(
  warehouseId: string,
  items: BulkWarehouseItemInput[]
) {
  try {
    if (!items.length) return { error: "No items to import" };

    // Validate no duplicate SKUs in the batch
    const skus = items.map((i) => i.sku);
    const uniqueSkus = new Set(skus);
    if (uniqueSkus.size !== skus.length) {
      return { error: "Duplicate SKUs found in import data" };
    }

    // Check for existing SKUs in this warehouse
    const existingItems = await db.warehouseInventoryItem.findMany({
      where: { warehouseId, sku: { in: skus } },
      select: { sku: true },
    });
    const existingSkus = new Set(existingItems.map((i) => i.sku));

    const newItems = items.filter((i) => !existingSkus.has(i.sku));
    const skippedCount = items.length - newItems.length;

    if (newItems.length === 0) {
      return { error: "All SKUs already exist in this warehouse", skipped: skippedCount };
    }

    const created = await db.warehouseInventoryItem.createMany({
      data: newItems.map((item) => ({
        warehouseId,
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        unitCost: item.unitCost,
        currentStock: item.currentStock || 0,
        minStock: item.minStock || 0,
        reorderPoint: item.reorderPoint || 10,
      })),
    });

    revalidatePath("/dashboard/warehouse");
    return { data: { created: created.count, skipped: skippedCount } };
  } catch (error) {
    console.error("[bulkCreateWarehouseItems] Error:", error);
    return { error: "Failed to bulk create warehouse items" };
  }
}

// ============================================
// UPDATE WAREHOUSE ITEM
// ============================================

export interface UpdateWarehouseItemInput {
  id: string;
  name?: string;
  category?: InventoryCategory;
  unit?: UnitType;
  unitCost?: number;
  minStock?: number;
  reorderPoint?: number;
  isActive?: boolean;
}

export async function updateWarehouseItem(input: UpdateWarehouseItemInput) {
  try {
    const { id, ...fields } = input;
    const data: Record<string, unknown> = {};
    if (fields.name !== undefined) data.name = fields.name;
    if (fields.category !== undefined) data.category = fields.category;
    if (fields.unit !== undefined) data.unit = fields.unit;
    if (fields.unitCost !== undefined) data.unitCost = fields.unitCost;
    if (fields.minStock !== undefined) data.minStock = fields.minStock;
    if (fields.reorderPoint !== undefined) data.reorderPoint = fields.reorderPoint;
    if (fields.isActive !== undefined) data.isActive = fields.isActive;

    const item = await db.warehouseInventoryItem.update({ where: { id }, data });

    revalidatePath("/dashboard/warehouse");
    return {
      data: {
        ...item,
        unitCost: Number(item.unitCost),
        currentStock: Number(item.currentStock),
        minStock: Number(item.minStock),
        reorderPoint: Number(item.reorderPoint),
      },
    };
  } catch (error) {
    console.error("[updateWarehouseItem] Error:", error);
    return { error: "Failed to update warehouse item" };
  }
}
