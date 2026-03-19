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
        warehouseItem: { select: { name: true, sku: true } },
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
        toBranchId: t.toBranchId,
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

      const transfer = await db.warehouseBranchTransfer.findUnique({ where: { id } });
      if (transfer) {
        await db.warehouseInventoryItem.update({
          where: { id: transfer.warehouseItemId },
          data: { currentStock: { decrement: Number(transfer.quantity) } },
        });
      }
    }

    const updated = await db.warehouseBranchTransfer.update({ where: { id }, data });

    revalidatePath("/dashboard/warehouse");
    return { data: updated };
  } catch (error) {
    console.error("[updateTransferStatus] Error:", error);
    return { error: "Failed to update transfer status" };
  }
}

export async function getWarehouseStats() {
  try {
    const [totalWarehouses, totalItems, pendingTransfers] = await Promise.all([
      db.warehouse.count({ where: { isActive: true } }),
      db.warehouseInventoryItem.count({ where: { isActive: true } }),
      db.warehouseBranchTransfer.count({ where: { status: "PENDING" } }),
    ]);

    return { data: { totalWarehouses, totalItems, pendingTransfers } };
  } catch (error) {
    console.error("[getWarehouseStats] Error:", error);
    return { data: { totalWarehouses: 0, totalItems: 0, pendingTransfers: 0 } };
  }
}
