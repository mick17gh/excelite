"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { UnitType, TransferStatus } from "@/lib/generated/prisma/client";
import { assertWarehouseMutationAllowed } from "@/lib/actions/warehouse-auth";
import {
  branchLimitsFromWarehouseItem,
  normalizeWarehouseMaxStock,
} from "@/lib/inventory/branch-stock-limits";

/** Prisma Decimal → plain number (RSC props and server-action responses must be JSON-serializable) */
function decimalToNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const d = value as { toNumber: () => number };
    if (typeof d.toNumber === "function") return d.toNumber();
  }
  const n = Number(value as string | number);
  return Number.isFinite(n) ? n : 0;
}

export interface CreateWarehouseInput {
  name: string;
  code: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  warehouseType?: "RAW" | "COMMISSARY";
  parentWarehouseId?: string;
}

export interface UpdateWarehouseInput {
  id: string;
  name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  warehouseType?: "RAW" | "COMMISSARY";
  isActive?: boolean;
}

export interface CreateWarehouseItemInput {
  warehouseId: string;
  name: string;
  sku: string;
  categoryId: string;
  unit: UnitType;
  unitCost: number;
  currentStock?: number;
  minStock?: number;
  reorderPoint?: number;
  maxStock?: number | null;
  itemStage?: "RAW" | "PROCESSED" | "BRANCH_READY";
  requiresCommissaryProcessing?: boolean;
  allowDirectToBranch?: boolean;
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
        warehouseType: w.warehouseType,
        parentWarehouseId: w.parentWarehouseId,
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
      include: { category: true },
      orderBy: { name: "asc" },
    });

    return {
      data: items.map((item) => ({
        id: item.id,
        warehouseId: item.warehouseId,
        name: item.name,
        sku: item.sku,
        categoryId: item.categoryId,
        category: item.category.name,
        unit: item.unit,
        unitCost: decimalToNumber(item.unitCost),
        currentStock: decimalToNumber(item.currentStock),
        minStock: decimalToNumber(item.minStock),
        reorderPoint: decimalToNumber(item.reorderPoint),
        maxStock: item.maxStock != null ? decimalToNumber(item.maxStock) : null,
        itemStage: item.itemStage,
        requiresCommissaryProcessing: item.requiresCommissaryProcessing,
        allowDirectToBranch: item.allowDirectToBranch,
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
        quantity: decimalToNumber(t.quantity),
        unitCost: decimalToNumber(t.unitCost),
        totalCost: decimalToNumber(t.totalCost),
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
        warehouseType: input.warehouseType || "RAW",
        parentWarehouseId: input.parentWarehouseId || null,
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
    if (input.warehouseType !== undefined) data.warehouseType = input.warehouseType;
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
        categoryId: input.categoryId,
        unit: input.unit,
        unitCost: input.unitCost,
        currentStock: input.currentStock || 0,
        minStock: input.minStock || 0,
        reorderPoint: input.reorderPoint || 10,
        maxStock: normalizeWarehouseMaxStock(input.maxStock),
        itemStage: input.itemStage || "RAW",
        requiresCommissaryProcessing: input.requiresCommissaryProcessing ?? false,
        allowDirectToBranch: input.allowDirectToBranch ?? true,
      },
      include: { category: true },
    });

    revalidatePath("/dashboard/warehouse");
    return {
      data: {
        id: item.id,
        warehouseId: item.warehouseId,
        name: item.name,
        sku: item.sku,
        categoryId: item.categoryId,
        category: item.category.name,
        unit: item.unit,
        unitCost: decimalToNumber(item.unitCost),
        currentStock: decimalToNumber(item.currentStock),
        minStock: decimalToNumber(item.minStock),
        reorderPoint: decimalToNumber(item.reorderPoint),
        maxStock: item.maxStock != null ? decimalToNumber(item.maxStock) : null,
        itemStage: item.itemStage,
        requiresCommissaryProcessing: item.requiresCommissaryProcessing,
        allowDirectToBranch: item.allowDirectToBranch,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[createWarehouseItem] Error:", error);
    return { error: "Failed to create warehouse item" };
  }
}

export async function createWarehouseTransfer(
  input: CreateWarehouseTransferInput & { requestedBy?: string },
) {
  try {
    const { createWarehouseBranchTransferWithApproval } = await import(
      "@/lib/actions/stock-transfers"
    );
    const result = await createWarehouseBranchTransferWithApproval({
      warehouseId: input.warehouseId,
      warehouseItemId: input.warehouseItemId,
      toBranchId: input.toBranchId,
      quantity: input.quantity,
      notes: input.notes,
      requestedBy: input.requestedBy,
    });
    if (result.error) return { error: result.error };
    const transfer = result.data!;

    revalidatePath("/dashboard/warehouse");
    return {
      data: {
        id: transfer.id,
        warehouseId: transfer.warehouseId,
        warehouseItemId: transfer.warehouseItemId,
        toBranchId: transfer.toBranchId,
        quantity: decimalToNumber(transfer.quantity),
        unitCost: decimalToNumber(transfer.unitCost),
        totalCost: decimalToNumber(transfer.totalCost),
        status: transfer.status,
        transferDate: transfer.transferDate.toISOString(),
        approvedBy: transfer.approvedBy,
        receivedBy: transfer.receivedBy,
        notes: transfer.notes,
        createdAt: transfer.createdAt.toISOString(),
        updatedAt: transfer.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[createWarehouseTransfer] Error:", error);
    return { error: "Failed to create transfer" };
  }
}

export async function updateTransferStatus(id: string, status: TransferStatus, userId?: string) {
  try {
    const existing = await db.warehouseBranchTransfer.findUnique({ where: { id } });
    if (!existing) return { error: "Transfer not found" };

    const auth = await assertWarehouseMutationAllowed(existing.warehouseId);
    if (!auth.ok) return { error: auth.error };
    const actorId = userId ?? auth.ctx.userId;

    if (status === "IN_TRANSIT" && existing.status === "APPROVED") {
      // ok
    } else if (status === "COMPLETED" && !["PENDING", "APPROVED", "IN_TRANSIT"].includes(existing.status)) {
      return { error: "Invalid status transition" };
    }

    const data: Record<string, unknown> = { status };

    if (status === "CANCELLED") {
      if (!["PENDING", "APPROVED", "IN_TRANSIT"].includes(existing.status)) {
        return { error: "This transfer can no longer be cancelled" };
      }
    }

    if (status === "IN_TRANSIT" && !existing.approvedBy) {
      data.approvedBy = actorId;
    }

    if (status === "COMPLETED") {
      data.receivedBy = actorId;

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

        // 2. Find or create branch inventory item (sync par limits from warehouse each receive)
        const branchLimits = branchLimitsFromWarehouseItem({
          minStock: decimalToNumber(whItem.minStock),
          reorderPoint: decimalToNumber(whItem.reorderPoint),
          maxStock:
            whItem.maxStock != null ? decimalToNumber(whItem.maxStock) : null,
        });

        const branchItem = await db.inventoryItem.findFirst({
          where: { sku: whItem.sku, branchId: transfer.toBranchId },
        });

        if (branchItem) {
          await db.inventoryItem.update({
            where: { id: branchItem.id },
            data: {
              currentStock: { increment: qty },
              lastRestockDate: new Date(),
              minStock: branchLimits.minStock,
              reorderPoint: branchLimits.reorderPoint,
              maxStock: branchLimits.maxStock,
            },
          });
        } else {
          await db.inventoryItem.create({
            data: {
              name: whItem.name,
              sku: whItem.sku,
              categoryId: whItem.categoryId,
              unit: whItem.unit,
              unitCost: whItem.unitCost,
              currentStock: qty,
              minStock: branchLimits.minStock,
              maxStock: branchLimits.maxStock,
              reorderPoint: branchLimits.reorderPoint,
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
    return {
      data: {
        id: updated.id,
        warehouseId: updated.warehouseId,
        warehouseItemId: updated.warehouseItemId,
        toBranchId: updated.toBranchId,
        quantity: decimalToNumber(updated.quantity),
        unitCost: decimalToNumber(updated.unitCost),
        totalCost: decimalToNumber(updated.totalCost),
        status: updated.status,
        transferDate: updated.transferDate.toISOString(),
        approvedBy: updated.approvedBy,
        receivedBy: updated.receivedBy,
        notes: updated.notes,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
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
        id: wasteLog.id,
        warehouseId: wasteLog.warehouseId,
        warehouseItemId: wasteLog.warehouseItemId,
        quantity: decimalToNumber(wasteLog.quantity),
        unitCost: decimalToNumber(wasteLog.unitCost),
        totalCost: decimalToNumber(wasteLog.totalCost),
        reason: wasteLog.reason,
        notes: wasteLog.notes,
        recordedBy: wasteLog.recordedBy,
        wasteDate: wasteLog.wasteDate.toISOString(),
        createdAt: wasteLog.createdAt.toISOString(),
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
        quantity: decimalToNumber(l.quantity),
        unitCost: decimalToNumber(l.unitCost),
        totalCost: decimalToNumber(l.totalCost),
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
        id: inbound.id,
        warehouseId: inbound.warehouseId,
        warehouseItemId: inbound.warehouseItemId,
        supplierId: inbound.supplierId,
        quantity: decimalToNumber(inbound.quantity),
        unitCost: decimalToNumber(inbound.unitCost),
        totalCost: decimalToNumber(inbound.totalCost),
        invoiceNumber: inbound.invoiceNumber,
        notes: inbound.notes,
        receivedBy: inbound.receivedBy,
        deliveryDate: inbound.deliveryDate.toISOString(),
        createdAt: inbound.createdAt.toISOString(),
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
        quantity: decimalToNumber(r.quantity),
        unitCost: decimalToNumber(r.unitCost),
        totalCost: decimalToNumber(r.totalCost),
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
  categoryId: string;
  unit: UnitType;
  unitCost: number;
  currentStock?: number;
  minStock?: number;
  reorderPoint?: number;
  maxStock?: number | null;
  itemStage?: "RAW" | "PROCESSED" | "BRANCH_READY";
  requiresCommissaryProcessing?: boolean;
  allowDirectToBranch?: boolean;
  isActive?: boolean;
}

export async function bulkCreateWarehouseItems(
  warehouseId: string,
  items: BulkWarehouseItemInput[]
) {
  try {
    if (!items.length) return { error: "No items to import" };

    const warehouse = await db.warehouse.findUnique({
      where: { id: warehouseId },
      select: { organizationId: true },
    });
    if (!warehouse) return { error: "Warehouse not found" };

    const categoryRows = await db.inventoryCategoryMaster.findMany({
      where: {
        organizationId: warehouse.organizationId,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true, name: true, code: true },
    });
    const categoryLookup = new Map<string, string>();
    for (const c of categoryRows) {
      categoryLookup.set(c.id, c.id);
      categoryLookup.set(c.name.trim().toLowerCase(), c.id);
      categoryLookup.set(c.code.trim().toLowerCase(), c.id);
    }

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

    const normalizedItems = newItems.map((item) => ({
      ...item,
      categoryId: categoryLookup.get(item.categoryId.trim().toLowerCase()) || "",
    }));

    const invalid = normalizedItems.filter((i) => !i.categoryId);
    if (invalid.length > 0) {
      return {
        error: `Unknown categories: ${invalid.map((i) => i.name).join(", ")}`,
      };
    }

    const created = await db.warehouseInventoryItem.createMany({
      data: newItems.map((item) => ({
        warehouseId,
        name: item.name,
        sku: item.sku,
        categoryId:
          categoryLookup.get(item.categoryId.trim().toLowerCase()) ||
          item.categoryId,
        unit: item.unit,
        unitCost: item.unitCost,
        currentStock: item.currentStock || 0,
        minStock: item.minStock || 0,
        reorderPoint: item.reorderPoint || 10,
        maxStock: normalizeWarehouseMaxStock(item.maxStock),
        itemStage: item.itemStage ?? "RAW",
        requiresCommissaryProcessing: item.requiresCommissaryProcessing ?? false,
        allowDirectToBranch: item.allowDirectToBranch ?? true,
        isActive: item.isActive ?? true,
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
  categoryId?: string;
  unit?: UnitType;
  unitCost?: number;
  currentStock?: number;
  minStock?: number;
  reorderPoint?: number;
  maxStock?: number | null;
  itemStage?: "RAW" | "PROCESSED" | "BRANCH_READY";
  requiresCommissaryProcessing?: boolean;
  allowDirectToBranch?: boolean;
  isActive?: boolean;
}

export async function updateWarehouseItem(input: UpdateWarehouseItemInput) {
  try {
    const { id, ...fields } = input;
    const data: Record<string, unknown> = {};
    if (fields.name !== undefined) data.name = fields.name;
    if (fields.categoryId !== undefined) data.categoryId = fields.categoryId;
    if (fields.unit !== undefined) data.unit = fields.unit;
    if (fields.unitCost !== undefined) data.unitCost = fields.unitCost;
    if (fields.currentStock !== undefined) data.currentStock = fields.currentStock;
    if (fields.minStock !== undefined) data.minStock = fields.minStock;
    if (fields.reorderPoint !== undefined) data.reorderPoint = fields.reorderPoint;
    if (fields.maxStock !== undefined) {
      data.maxStock = normalizeWarehouseMaxStock(fields.maxStock);
    }
    if (fields.itemStage !== undefined) data.itemStage = fields.itemStage;
    if (fields.requiresCommissaryProcessing !== undefined) {
      data.requiresCommissaryProcessing = fields.requiresCommissaryProcessing;
    }
    if (fields.allowDirectToBranch !== undefined) {
      data.allowDirectToBranch = fields.allowDirectToBranch;
    }
    if (fields.isActive !== undefined) data.isActive = fields.isActive;

    const item = await db.warehouseInventoryItem.update({
      where: { id },
      data,
      include: { category: true },
    });

    revalidatePath("/dashboard/warehouse");
    return {
      data: {
        id: item.id,
        warehouseId: item.warehouseId,
        name: item.name,
        sku: item.sku,
        categoryId: item.categoryId,
        category: item.category.name,
        unit: item.unit,
        unitCost: decimalToNumber(item.unitCost),
        currentStock: decimalToNumber(item.currentStock),
        minStock: decimalToNumber(item.minStock),
        reorderPoint: decimalToNumber(item.reorderPoint),
        maxStock: item.maxStock != null ? decimalToNumber(item.maxStock) : null,
        itemStage: item.itemStage,
        requiresCommissaryProcessing: item.requiresCommissaryProcessing,
        allowDirectToBranch: item.allowDirectToBranch,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[updateWarehouseItem] Error:", error);
    return { error: "Failed to update warehouse item" };
  }
}
