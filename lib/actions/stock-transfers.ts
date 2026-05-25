"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { TransferStatus } from "@/lib/generated/prisma/client";
import {
  assertWarehouseTypes,
  validateDirectToBranchTransfer,
} from "@/lib/services/stock-transfer-rules";
import {
  assertWarehouseDispatchApprovalAllowed,
  assertWarehouseMutationAllowed,
} from "@/lib/actions/warehouse-auth";

function decimalToNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  const n = Number(value as string | number);
  return Number.isFinite(n) ? n : 0;
}

export interface CreateWhToWhTransferInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  warehouseItemId: string;
  quantity: number;
  notes?: string;
  transferKind?: "MATERIAL_ISSUE" | "GENERAL";
}

export async function createWarehouseToWarehouseTransfer(
  input: CreateWhToWhTransferInput,
) {
  try {
    const [fromWh, toWh, item] = await Promise.all([
      db.warehouse.findUnique({ where: { id: input.fromWarehouseId } }),
      db.warehouse.findUnique({ where: { id: input.toWarehouseId } }),
      db.warehouseInventoryItem.findUnique({ where: { id: input.warehouseItemId } }),
    ]);

    if (!fromWh || !toWh || !item) return { error: "Warehouse or item not found" };
    if (item.warehouseId !== input.fromWarehouseId) {
      return { error: "Item does not belong to source warehouse" };
    }
    if (Number(item.currentStock) < input.quantity) {
      return { error: "Insufficient stock for transfer" };
    }

    const kind = input.transferKind || "MATERIAL_ISSUE";
    const typeCheck = assertWarehouseTypes(
      fromWh.warehouseType,
      toWh.warehouseType,
      kind === "MATERIAL_ISSUE" ? "material_issue" : "general",
    );
    if (!typeCheck.ok) return { error: typeCheck.error };

    const transfer = await db.warehouseTransfer.create({
      data: {
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        warehouseItemId: input.warehouseItemId,
        transferKind: kind,
        quantity: input.quantity,
        unitCost: Number(item.unitCost),
        totalCost: input.quantity * Number(item.unitCost),
        status: "PENDING",
        transferDate: new Date(),
        notes: input.notes || null,
      },
    });

    revalidatePath("/dashboard/warehouse");
    return { data: serializeWhTransfer(transfer) };
  } catch (error) {
    console.error("[createWarehouseToWarehouseTransfer]", error);
    return { error: "Failed to create warehouse transfer" };
  }
}

export async function updateWarehouseTransferStatus(
  id: string,
  status: TransferStatus,
  userId?: string,
) {
  try {
    const existing = await db.warehouseTransfer.findUnique({ where: { id } });
    if (!existing) return { error: "Transfer not found" };

    const auth = await assertWarehouseMutationAllowed(existing.toWarehouseId);
    if (!auth.ok) return { error: auth.error };
    const actorId = userId ?? auth.ctx.userId;

    const data: Record<string, unknown> = { status };

    if (status === "IN_TRANSIT") {
      if (existing.status !== "PENDING") {
        return { error: "Only pending transfers can be approved" };
      }
      data.approvedBy = actorId;
    }

    if (status === "CANCELLED") {
      if (!["PENDING", "IN_TRANSIT"].includes(existing.status)) {
        return { error: "Only pending or in-transit transfers can be cancelled" };
      }
    }

    if (status === "COMPLETED") {
      if (!["PENDING", "IN_TRANSIT"].includes(existing.status)) {
        return { error: "Invalid status transition" };
      }
      data.receivedBy = actorId;
      const transfer = await db.warehouseTransfer.findUnique({
        where: { id },
        include: { warehouseItem: true },
      });
      if (!transfer) return { error: "Transfer not found" };

      const qty = Number(transfer.quantity);
      const whItem = transfer.warehouseItem;

      await db.warehouseInventoryItem.update({
        where: { id: transfer.warehouseItemId },
        data: { currentStock: { decrement: qty } },
      });

      const destItem = await db.warehouseInventoryItem.findFirst({
        where: { sku: whItem.sku, warehouseId: transfer.toWarehouseId },
      });

      if (destItem) {
        await db.warehouseInventoryItem.update({
          where: { id: destItem.id },
          data: { currentStock: { increment: qty } },
        });
      } else {
        await db.warehouseInventoryItem.create({
          data: {
            warehouseId: transfer.toWarehouseId,
            name: whItem.name,
            sku: whItem.sku,
            category: whItem.category,
            unit: whItem.unit,
            unitCost: whItem.unitCost,
            currentStock: qty,
            minStock: whItem.minStock,
            reorderPoint: whItem.reorderPoint,
            itemStage: whItem.itemStage === "RAW" ? "PROCESSED" : whItem.itemStage,
            requiresCommissaryProcessing: false,
            allowDirectToBranch: whItem.allowDirectToBranch,
          },
        });
      }
    }

    const updated = await db.warehouseTransfer.update({ where: { id }, data });
    revalidatePath("/dashboard/warehouse");
    return { data: serializeWhTransfer(updated) };
  } catch (error) {
    console.error("[updateWarehouseTransferStatus]", error);
    return { error: "Failed to update transfer" };
  }
}

export async function getWarehouseTransfers(warehouseId?: string) {
  try {
    const transfers = await db.warehouseTransfer.findMany({
      where: warehouseId
        ? { OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }] }
        : undefined,
      include: {
        fromWarehouse: { select: { name: true, code: true, warehouseType: true } },
        toWarehouse: { select: { name: true, code: true, warehouseType: true } },
        warehouseItem: { select: { name: true, sku: true, unit: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return {
      data: transfers.map((t) => ({
        ...serializeWhTransfer(t),
        fromWarehouseName: t.fromWarehouse.name,
        toWarehouseName: t.toWarehouse.name,
        itemName: t.warehouseItem.name,
        itemSku: t.warehouseItem.sku,
        itemUnit: t.warehouseItem.unit,
      })),
    };
  } catch (error) {
    console.error("[getWarehouseTransfers]", error);
    return { data: [] };
  }
}

export interface CreateBranchToWarehouseInput {
  fromBranchId: string;
  toWarehouseId: string;
  branchItemId: string;
  quantity: number;
  notes?: string;
}

export async function createBranchToWarehouseTransfer(input: CreateBranchToWarehouseInput) {
  try {
    const branchItem = await db.inventoryItem.findUnique({
      where: { id: input.branchItemId },
    });
    if (!branchItem) return { error: "Branch item not found" };
    if (branchItem.branchId !== input.fromBranchId) {
      return { error: "Item does not belong to selected branch" };
    }
    if (Number(branchItem.currentStock) < input.quantity) {
      return { error: "Insufficient branch stock" };
    }

    const transfer = await db.branchWarehouseTransfer.create({
      data: {
        fromBranchId: input.fromBranchId,
        toWarehouseId: input.toWarehouseId,
        branchItemId: input.branchItemId,
        quantity: input.quantity,
        unitCost: Number(branchItem.unitCost),
        totalCost: input.quantity * Number(branchItem.unitCost),
        status: "PENDING",
        transferDate: new Date(),
        notes: input.notes || null,
      },
    });

    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/warehouse");
    return { data: serializeBranchWhTransfer(transfer) };
  } catch (error) {
    console.error("[createBranchToWarehouseTransfer]", error);
    return { error: "Failed to create return transfer" };
  }
}

export async function updateBranchWarehouseTransferStatus(
  id: string,
  status: TransferStatus,
  userId?: string,
) {
  try {
    const existing = await db.branchWarehouseTransfer.findUnique({
      where: { id },
      include: { branchItem: true },
    });
    if (!existing) return { error: "Transfer not found" };

    const auth = await assertWarehouseMutationAllowed(existing.toWarehouseId);
    if (!auth.ok) return { error: auth.error };
    const actorId = userId ?? auth.ctx.userId;

    const openStatuses = ["PENDING", "IN_TRANSIT"];
    if (status === "COMPLETED" || status === "CANCELLED") {
      if (!openStatuses.includes(existing.status)) {
        return { error: "This return can no longer be updated" };
      }
    } else {
      return { error: "Invalid status for branch return" };
    }

    if (status === "COMPLETED") {
      const qty = Number(existing.quantity);
      const bi = existing.branchItem;
      if (Number(bi.currentStock) < qty) {
        return { error: "Insufficient branch stock to complete this return" };
      }

      await db.inventoryItem.update({
        where: { id: bi.id },
        data: { currentStock: { decrement: qty } },
      });

      const whItem = await db.warehouseInventoryItem.findFirst({
        where: { sku: bi.sku, warehouseId: existing.toWarehouseId },
      });

      if (whItem) {
        await db.warehouseInventoryItem.update({
          where: { id: whItem.id },
          data: { currentStock: { increment: qty } },
        });
      } else {
        await db.warehouseInventoryItem.create({
          data: {
            warehouseId: existing.toWarehouseId,
            name: bi.name,
            sku: bi.sku,
            category: bi.category,
            unit: bi.unit,
            unitCost: bi.unitCost,
            currentStock: qty,
            minStock: bi.minStock,
            reorderPoint: bi.reorderPoint,
          },
        });
      }
    }

    const updated = await db.branchWarehouseTransfer.update({
      where: { id },
      data: {
        status,
        ...(status === "COMPLETED" ? { receivedBy: actorId } : {}),
      },
    });
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/warehouse");
    return { data: serializeBranchWhTransfer(updated) };
  } catch (error) {
    console.error("[updateBranchWarehouseTransferStatus]", error);
    return { error: "Failed to update transfer" };
  }
}

export interface BranchWarehouseTransferFilters {
  fromBranchId?: string;
  toWarehouseId?: string;
  statuses?: TransferStatus[];
  limit?: number;
}

export async function getBranchWarehouseTransfers(
  filters?: BranchWarehouseTransferFilters | string,
) {
  try {
    const resolved: BranchWarehouseTransferFilters =
      typeof filters === "string" ? { fromBranchId: filters } : filters ?? {};

    const where: {
      fromBranchId?: string;
      toWarehouseId?: string;
      status?: { in: TransferStatus[] };
    } = {};
    if (resolved.fromBranchId) where.fromBranchId = resolved.fromBranchId;
    if (resolved.toWarehouseId) where.toWarehouseId = resolved.toWarehouseId;
    if (resolved.statuses?.length) where.status = { in: resolved.statuses };

    const transfers = await db.branchWarehouseTransfer.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        fromBranch: { select: { name: true, code: true } },
        toWarehouse: { select: { name: true, code: true } },
        branchItem: { select: { name: true, sku: true, unit: true } },
      },
      orderBy: { createdAt: "desc" },
      take: resolved.limit ?? 100,
    });
    return {
      data: transfers.map((t) => ({
        ...serializeBranchWhTransfer(t),
        branchName: t.fromBranch.name,
        warehouseName: t.toWarehouse.name,
        itemName: t.branchItem.name,
        itemSku: t.branchItem.sku,
        itemUnit: t.branchItem.unit,
      })),
    };
  } catch (error) {
    return { data: [] };
  }
}

export async function createWarehouseBranchTransferWithApproval(input: {
  warehouseId: string;
  warehouseItemId: string;
  toBranchId: string;
  quantity: number;
  notes?: string;
  requestedBy?: string;
}) {
  try {
    const routeCheck = await validateDirectToBranchTransfer(
      input.warehouseId,
      input.warehouseItemId,
    );
    if (!routeCheck.ok) return { error: routeCheck.error };

    const [warehouse, item] = await Promise.all([
      db.warehouse.findUnique({ where: { id: input.warehouseId } }),
      db.warehouseInventoryItem.findUnique({ where: { id: input.warehouseItemId } }),
    ]);
    if (!warehouse || !item) return { error: "Warehouse or item not found" };
    if (Number(item.currentStock) < input.quantity) {
      return { error: "Insufficient stock for transfer" };
    }

    const needsWarehouseApproval = warehouse.warehouseType === "COMMISSARY";
    const initialStatus: TransferStatus = needsWarehouseApproval
      ? "AWAITING_WAREHOUSE_APPROVAL"
      : "PENDING";

    const transfer = await db.warehouseBranchTransfer.create({
      data: {
        warehouseId: input.warehouseId,
        warehouseItemId: input.warehouseItemId,
        toBranchId: input.toBranchId,
        quantity: input.quantity,
        unitCost: Number(item.unitCost),
        totalCost: input.quantity * Number(item.unitCost),
        status: initialStatus,
        transferDate: new Date(),
        notes: input.notes || null,
        requestedBy: input.requestedBy || null,
      },
    });

    revalidatePath("/dashboard/warehouse");
    revalidatePath("/dashboard/inventory");
    return { data: transfer };
  } catch (error) {
    console.error("[createWarehouseBranchTransferWithApproval]", error);
    return { error: "Failed to create transfer" };
  }
}

async function getSessionUserId(): Promise<string | null> {
  const { headers: getHeaders } = await import("next/headers");
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: await getHeaders() });
  return session?.user?.id ?? null;
}

export async function approveCommissaryDispatch(transferId: string, userId?: string) {
  try {
    const transfer = await db.warehouseBranchTransfer.findUnique({
      where: { id: transferId },
      include: { warehouse: true },
    });
    if (!transfer) return { error: "Transfer not found" };
    if (transfer.status !== "AWAITING_WAREHOUSE_APPROVAL") {
      return { error: "Transfer is not awaiting warehouse approval" };
    }

    const auth = await assertWarehouseDispatchApprovalAllowed();
    if (!auth.ok) return { error: auth.error };
    const approverId = userId ?? auth.ctx.userId;

    if (
      auth.ctx.assignedWarehouseId &&
      (auth.ctx.role === "WAREHOUSE_STAFF" || auth.ctx.role === "COMMISSARY_STAFF") &&
      auth.ctx.assignedWarehouseId !== transfer.warehouseId
    ) {
      return { error: "This action is limited to your assigned warehouse" };
    }

    const updated = await db.warehouseBranchTransfer.update({
      where: { id: transferId },
      data: {
        status: "APPROVED",
        warehouseApprovedBy: approverId,
        warehouseApprovedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/warehouse");
    return { data: updated };
  } catch (error) {
    console.error("[approveCommissaryDispatch]", error);
    return { error: "Failed to approve dispatch" };
  }
}

export async function getPendingDispatchApprovals() {
  try {
    const transfers = await db.warehouseBranchTransfer.findMany({
      where: {
        status: { in: ["AWAITING_WAREHOUSE_APPROVAL", "APPROVED"] },
      },
      include: {
        warehouse: { select: { id: true, name: true, code: true, warehouseType: true } },
        warehouseItem: { select: { name: true, sku: true, unit: true } },
        toBranch: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return {
      data: transfers.map((t) => ({
        id: t.id,
        quantity: decimalToNumber(t.quantity),
        status: t.status,
        warehouse: t.warehouse,
        warehouseItem: t.warehouseItem,
        toBranch: t.toBranch,
      })),
    };
  } catch (error) {
    return { data: [] };
  }
}

function serializeWhTransfer(t: {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  warehouseItemId: string;
  quantity: unknown;
  unitCost: unknown;
  totalCost: unknown;
  status: TransferStatus;
  transferDate: Date;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    id: t.id,
    fromWarehouseId: t.fromWarehouseId,
    toWarehouseId: t.toWarehouseId,
    warehouseItemId: t.warehouseItemId,
    quantity: decimalToNumber(t.quantity),
    unitCost: decimalToNumber(t.unitCost),
    totalCost: decimalToNumber(t.totalCost),
    status: t.status,
    transferDate: t.transferDate.toISOString(),
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
  };
}

function serializeBranchWhTransfer(t: {
  id: string;
  fromBranchId: string;
  toWarehouseId: string;
  branchItemId: string;
  quantity: unknown;
  unitCost: unknown;
  totalCost: unknown;
  status: TransferStatus;
  transferDate: Date;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    id: t.id,
    fromBranchId: t.fromBranchId,
    toWarehouseId: t.toWarehouseId,
    branchItemId: t.branchItemId,
    quantity: decimalToNumber(t.quantity),
    unitCost: decimalToNumber(t.unitCost),
    totalCost: decimalToNumber(t.totalCost),
    status: t.status,
    transferDate: t.transferDate.toISOString(),
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
  };
}
