"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma, StockMovementType } from "@/lib/generated/prisma/client";
import {
  getBusinessDayBounds,
  parseDateKeyToUtcDate,
} from "@/lib/inventory/business-day";
import {
  canReconcileRole,
  canViewReconciliationHistory,
  resolveReconciliationBranch,
  resolveReconciliationOrgId,
  resolveReconciliationViewer,
} from "@/lib/inventory/reconciliation-auth";
import { movementTypeForReason } from "@/lib/inventory/reconciliation-constants";
import { createAuditLog } from "@/lib/services/audit";
import { createLowStockAlertsForItems } from "@/lib/services/inventory-deduction";

export interface ReconciliationCandidate {
  itemId: string;
  name: string;
  sku: string;
  unit: string;
  category: string;
  expectedQty: number;
  actualQty?: number;
  wasteReason?: string | null;
  unitCost: number;
}

export interface ReconciliationLineInput {
  itemId: string;
  expectedQty: number;
  actualQty: number;
  wasteReason?: string;
  notes?: string;
}

export interface SubmitReconciliationInput {
  branchId?: string;
  dateKey?: string;
  lines: ReconciliationLineInput[];
  notes?: string;
}

async function getBranchTimezone(branchId: string): Promise<string> {
  const branch = await db.branch.findUnique({
    where: { id: branchId },
    select: { timezone: true },
  });
  return branch?.timezone || "Africa/Accra";
}

async function collectMovedItemIds(
  branchId: string,
  start: Date,
  end: Date
): Promise<Set<string>> {
  const ids = new Set<string>();

  const [
    outbound,
    waste,
    transfersOut,
    transfersIn,
    whReceives,
    branchReturns,
    recipeItemIds,
  ] = await Promise.all([
    db.outboundStock.findMany({
      where: { branchId, createdAt: { gte: start, lte: end } },
      select: { itemId: true },
    }),
    db.wasteLog.findMany({
      where: { branchId, wasteDate: { gte: start, lte: end } },
      select: { itemId: true },
    }),
    db.transferLog.findMany({
      where: {
        fromBranchId: branchId,
        status: "COMPLETED",
        transferDate: { gte: start, lte: end },
      },
      select: { itemId: true },
    }),
    db.transferLog.findMany({
      where: {
        toBranchId: branchId,
        status: "COMPLETED",
        transferDate: { gte: start, lte: end },
      },
      select: { itemId: true },
    }),
    db.warehouseBranchTransfer.findMany({
      where: {
        toBranchId: branchId,
        status: "COMPLETED",
        updatedAt: { gte: start, lte: end },
      },
      include: { warehouseItem: { select: { sku: true } } },
    }),
    db.branchWarehouseTransfer.findMany({
      where: {
        fromBranchId: branchId,
        status: "COMPLETED",
        updatedAt: { gte: start, lte: end },
      },
      select: { branchItemId: true },
    }),
    collectRecipeItemIdsFromSales(branchId, start, end),
  ]);

  for (const row of outbound) ids.add(row.itemId);
  for (const row of waste) ids.add(row.itemId);
  for (const row of transfersOut) ids.add(row.itemId);
  for (const row of transfersIn) ids.add(row.itemId);
  for (const row of branchReturns) ids.add(row.branchItemId);

  if (whReceives.length > 0) {
    const skus = [...new Set(whReceives.map((t) => t.warehouseItem.sku))];
    const branchItems = await db.inventoryItem.findMany({
      where: { branchId, sku: { in: skus }, deletedAt: null, isActive: true },
      select: { id: true },
    });
    for (const item of branchItems) ids.add(item.id);
  }

  for (const itemId of recipeItemIds) ids.add(itemId);

  return ids;
}

async function collectRecipeItemIdsFromSales(
  branchId: string,
  start: Date,
  end: Date
): Promise<string[]> {
  const menuItemIds = new Set<string>();

  const [sales, orders] = await Promise.all([
    db.sale.findMany({
      where: {
        branchId,
        deletedAt: null,
        saleDate: { gte: start, lte: end },
      },
      include: { items: { select: { menuItemId: true } } },
    }),
    db.order.findMany({
      where: {
        branchId,
        paymentStatus: "PAID",
        OR: [
          { orderReceivedTime: { gte: start, lte: end } },
          { closedAt: { gte: start, lte: end } },
          { updatedAt: { gte: start, lte: end } },
        ],
      },
      include: { items: { select: { menuItemId: true } } },
    }),
  ]);

  for (const sale of sales) {
    for (const item of sale.items) menuItemIds.add(item.menuItemId);
  }
  for (const order of orders) {
    for (const item of order.items) menuItemIds.add(item.menuItemId);
  }

  if (menuItemIds.size === 0) return [];

  const recipes = await db.menuItemIngredient.findMany({
    where: { menuItemId: { in: [...menuItemIds] } },
    select: {
      inventoryItemId: true,
      inventoryItem: { select: { branchId: true, deletedAt: true, isActive: true } },
    },
  });

  return recipes
    .filter(
      (r) =>
        r.inventoryItem.branchId === branchId &&
        !r.inventoryItem.deletedAt &&
        r.inventoryItem.isActive
    )
    .map((r) => r.inventoryItemId);
}

export async function getReconciliationCandidates(
  requestedBranchId?: string,
  dateKey?: string
) {
  try {
    const authResult = await resolveReconciliationViewer();
    if (!authResult.ok) return { success: false, error: authResult.error };

    const viewer = authResult.viewer;
    const organizationId = await resolveReconciliationOrgId(viewer.userId);
    if (!organizationId || !(await canReconcileRole(viewer.role, organizationId))) {
      return { success: false, error: "You do not have permission to reconcile stock" };
    }

    const branchId = resolveReconciliationBranch(viewer, requestedBranchId);
    const timezone = await getBranchTimezone(branchId);
    const bounds = getBusinessDayBounds(timezone, dateKey);

    const existingSession = await db.stockReconciliationSession.findUnique({
      where: {
        branchId_reconciliationDate_status: {
          branchId,
          reconciliationDate: parseDateKeyToUtcDate(bounds.dateKey),
          status: "SUBMITTED",
        },
      },
      include: {
        stockCounts: {
          include: {
            item: {
              include: { category: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (existingSession) {
      const candidates: ReconciliationCandidate[] = existingSession.stockCounts.map((c) => ({
        itemId: c.itemId,
        name: c.item.name,
        sku: c.item.sku,
        unit: c.item.unit,
        category: c.item.category.name,
        expectedQty: Number(c.expectedQty),
        actualQty: Number(c.actualQty),
        wasteReason: c.wasteReason,
        unitCost: Number(c.item.unitCost),
      }));

      return {
        success: true,
        data: {
          branchId,
          dateKey: bounds.dateKey,
          timezone,
          alreadySubmitted: true,
          sessionId: existingSession.id,
          candidates,
          submittedAt: existingSession.createdAt,
          submittedBy: existingSession.submittedBy,
        },
      };
    }

    const itemIds = await collectMovedItemIds(branchId, bounds.start, bounds.end);

    if (itemIds.size === 0) {
      return {
        success: true,
        data: {
          branchId,
          dateKey: bounds.dateKey,
          timezone,
          alreadySubmitted: false,
          candidates: [] as ReconciliationCandidate[],
        },
      };
    }

    const items = await db.inventoryItem.findMany({
      where: {
        id: { in: [...itemIds] },
        branchId,
        deletedAt: null,
        isActive: true,
      },
      include: { category: { select: { name: true } } },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    });

    const candidates: ReconciliationCandidate[] = items.map((item) => ({
      itemId: item.id,
      name: item.name,
      sku: item.sku,
      unit: item.unit,
      category: item.category.name,
      expectedQty: Number(item.currentStock),
      unitCost: Number(item.unitCost),
    }));

    return {
      success: true,
      data: {
        branchId,
        dateKey: bounds.dateKey,
        timezone,
        alreadySubmitted: false,
        candidates,
      },
    };
  } catch (error) {
    console.error("[getReconciliationCandidates]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load reconciliation items",
    };
  }
}

export async function submitStockReconciliation(input: SubmitReconciliationInput) {
  try {
    const authResult = await resolveReconciliationViewer();
    if (!authResult.ok) return { success: false, error: authResult.error };

    const viewer = authResult.viewer;
    const organizationId = await resolveReconciliationOrgId(viewer.userId);
    if (!organizationId || !(await canReconcileRole(viewer.role, organizationId))) {
      return { success: false, error: "You do not have permission to reconcile stock" };
    }

    const branchId = resolveReconciliationBranch(viewer, input.branchId);
    const timezone = await getBranchTimezone(branchId);
    const bounds = getBusinessDayBounds(timezone, input.dateKey);
    const reconciliationDate = parseDateKeyToUtcDate(bounds.dateKey);

    if (!input.lines?.length) {
      return { success: false, error: "No items to reconcile" };
    }

    const seenItemIds = new Set<string>();
    for (const line of input.lines) {
      if (seenItemIds.has(line.itemId)) {
        return { success: false, error: "Duplicate items in reconciliation payload" };
      }
      seenItemIds.add(line.itemId);
      if (line.actualQty < 0) {
        return { success: false, error: "Actual quantity cannot be negative" };
      }
      const variance = line.expectedQty - line.actualQty;
      if (Math.abs(variance) > 0.0001 && !line.wasteReason?.trim()) {
        return {
          success: false,
          error: "Variance reason is required when actual differs from system stock",
        };
      }
    }

    const existingSession = await db.stockReconciliationSession.findUnique({
      where: {
        branchId_reconciliationDate_status: {
          branchId,
          reconciliationDate,
          status: "SUBMITTED",
        },
      },
    });

    if (existingSession) {
      return {
        success: false,
        error: `Stock already reconciled for ${bounds.dateKey}. View the existing session in history.`,
      };
    }

    const itemIds = input.lines.map((l) => l.itemId);
    const items = await db.inventoryItem.findMany({
      where: { id: { in: itemIds }, branchId, deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        currentStock: true,
        unitCost: true,
        reorderPoint: true,
      },
    });

    if (items.length !== itemIds.length) {
      return { success: false, error: "One or more items are invalid for this branch" };
    }

    const itemMap = new Map(items.map((i) => [i.id, i]));

    const staleItems: string[] = [];
    for (const line of input.lines) {
      const item = itemMap.get(line.itemId)!;
      if (Math.abs(Number(item.currentStock) - line.expectedQty) > 0.0001) {
        staleItems.push(item.name);
      }
    }

    if (staleItems.length > 0) {
      return {
        success: false,
        error: `System stock changed since you opened reconciliation. Refresh and recount: ${staleItems.slice(0, 5).join(", ")}${staleItems.length > 5 ? "…" : ""}`,
        stale: true,
      };
    }

    const salesSum = await db.sale.aggregate({
      where: {
        branchId,
        deletedAt: null,
        saleDate: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { total: true },
    });

    let totalShortageQty = 0;
    let totalOverageQty = 0;
    let totalVarianceCost = 0;
    const lowStockChecks: Array<{
      itemId: string;
      itemName: string;
      currentStock: number;
      reorderPoint: number;
    }> = [];

    const sessionResult = await db.$transaction(async (tx) => {
      const session = await tx.stockReconciliationSession.create({
        data: {
          branchId,
          reconciliationDate,
          status: "SUBMITTED",
          itemCount: input.lines.length,
          totalShortageQty: 0,
          totalOverageQty: 0,
          totalVarianceCost: 0,
          salesTotalSnapshot: salesSum._sum.total ?? null,
          submittedBy: viewer.name || viewer.userId,
          notes: input.notes || null,
        },
      });

      const countedAt = new Date();

      for (const line of input.lines) {
        const item = itemMap.get(line.itemId)!;
        const expected = line.expectedQty;
        const actual = line.actualQty;
        const variance = expected - actual;
        const unitCost = Number(item.unitCost);

        if (variance > 0) {
          totalShortageQty += variance;
          totalVarianceCost += variance * unitCost;
        } else if (variance < 0) {
          totalOverageQty += Math.abs(variance);
        }

        const stockCount = await tx.inventoryStockCount.create({
          data: {
            branchId,
            itemId: line.itemId,
            sessionId: session.id,
            expectedQty: expected,
            actualQty: actual,
            wasteReason: Math.abs(variance) > 0.0001 ? line.wasteReason : null,
            countedAt,
            recordedBy: viewer.name || viewer.userId,
            notes: line.notes || null,
          },
        });

        await tx.inventoryItem.update({
          where: { id: line.itemId },
          data: { currentStock: actual },
        });

        if (Math.abs(variance) > 0.0001) {
          const qty = Math.abs(variance);
          const movementType: StockMovementType =
            variance > 0
              ? movementTypeForReason(line.wasteReason)
              : "ADJUSTMENT_CORRECTION";

          await tx.outboundStock.create({
            data: {
              branchId,
              itemId: line.itemId,
              quantity: qty,
              movementType,
              reason: line.wasteReason || "Stock reconciliation adjustment",
              reference: stockCount.id,
              createdBy: viewer.userId,
            },
          });
        }

        if (actual <= Number(item.reorderPoint)) {
          lowStockChecks.push({
            itemId: item.id,
            itemName: item.name,
            currentStock: actual,
            reorderPoint: Number(item.reorderPoint),
          });
        }
      }

      return tx.stockReconciliationSession.update({
        where: { id: session.id },
        data: {
          totalShortageQty,
          totalOverageQty,
          totalVarianceCost,
        },
      });
    });

    if (lowStockChecks.length > 0) {
      await createLowStockAlertsForItems(branchId, lowStockChecks);
    }

    await createAuditLog({
      action: "ADJUSTMENT",
      entityType: "StockReconciliationSession",
      entityId: sessionResult.id,
      newValues: {
        branchId,
        dateKey: bounds.dateKey,
        itemCount: input.lines.length,
        totalShortageQty,
        totalOverageQty,
        totalVarianceCost,
      },
      userId: viewer.userId,
    });

    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/pos");
    revalidatePath(`/dashboard/branches/${branchId}`);

    return {
      success: true,
      data: {
        sessionId: sessionResult.id,
        itemCount: input.lines.length,
        totalShortageQty,
        totalOverageQty,
        totalVarianceCost,
        dateKey: bounds.dateKey,
      },
    };
  } catch (error) {
    console.error("[submitStockReconciliation]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit reconciliation",
    };
  }
}

export async function getReconciliationHistory(
  requestedBranchId?: string,
  startDateKey?: string,
  endDateKey?: string
) {
  try {
    const authResult = await resolveReconciliationViewer();
    if (!authResult.ok) return { success: false, error: authResult.error };

    const viewer = authResult.viewer;
    const organizationId = await resolveReconciliationOrgId(viewer.userId);
    if (!organizationId || !(await canViewReconciliationHistory(viewer.role, organizationId))) {
      return { success: false, error: "You do not have permission to view reconciliation history" };
    }

    const branchId = resolveReconciliationBranch(viewer, requestedBranchId);
    const timezone = await getBranchTimezone(branchId);

    const dateFilter: Prisma.StockReconciliationSessionWhereInput = {};
    if (startDateKey || endDateKey) {
      dateFilter.reconciliationDate = {};
      if (startDateKey) {
        dateFilter.reconciliationDate.gte = parseDateKeyToUtcDate(startDateKey);
      }
      if (endDateKey) {
        dateFilter.reconciliationDate.lte = parseDateKeyToUtcDate(endDateKey);
      }
    }

    const sessions = await db.stockReconciliationSession.findMany({
      where: { branchId, status: "SUBMITTED", ...dateFilter },
      orderBy: { reconciliationDate: "desc" },
      include: {
        stockCounts: {
          include: {
            item: { include: { category: { select: { name: true } } } },
          },
        },
      },
      take: 50,
    });

    return {
      success: true,
      data: {
        branchId,
        timezone,
        sessions: sessions.map((s) => ({
          id: s.id,
          reconciliationDate: s.reconciliationDate,
          dateKey: s.reconciliationDate.toISOString().slice(0, 10),
          itemCount: s.itemCount,
          totalShortageQty: Number(s.totalShortageQty),
          totalOverageQty: Number(s.totalOverageQty),
          totalVarianceCost: Number(s.totalVarianceCost),
          salesTotalSnapshot: s.salesTotalSnapshot ? Number(s.salesTotalSnapshot) : null,
          submittedBy: s.submittedBy,
          notes: s.notes,
          createdAt: s.createdAt,
          lines: s.stockCounts.map((c) => ({
            itemId: c.itemId,
            itemName: c.item.name,
            sku: c.item.sku,
            category: c.item.category.name,
            unit: c.item.unit,
            expectedQty: Number(c.expectedQty),
            actualQty: Number(c.actualQty),
            variance: Number(c.expectedQty) - Number(c.actualQty),
            wasteReason: c.wasteReason,
            unitCost: Number(c.item.unitCost),
            lossValue:
              Math.max(0, Number(c.expectedQty) - Number(c.actualQty)) *
              Number(c.item.unitCost),
          })),
        })),
      },
    };
  } catch (error) {
    console.error("[getReconciliationHistory]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load reconciliation history",
    };
  }
}

export async function getReconciliationStatusForDate(
  requestedBranchId?: string,
  dateKey?: string
) {
  try {
    const authResult = await resolveReconciliationViewer();
    if (!authResult.ok) return { success: false, error: authResult.error };

    const viewer = authResult.viewer;
    const organizationId = await resolveReconciliationOrgId(viewer.userId);
    if (!organizationId || !(await canViewReconciliationHistory(viewer.role, organizationId))) {
      return { success: false, error: "Forbidden" };
    }

    const branchId = resolveReconciliationBranch(viewer, requestedBranchId);
    const timezone = await getBranchTimezone(branchId);
    const bounds = getBusinessDayBounds(timezone, dateKey);

    const session = await db.stockReconciliationSession.findUnique({
      where: {
        branchId_reconciliationDate_status: {
          branchId,
          reconciliationDate: parseDateKeyToUtcDate(bounds.dateKey),
          status: "SUBMITTED",
        },
      },
      select: {
        id: true,
        itemCount: true,
        totalVarianceCost: true,
        submittedBy: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      data: {
        dateKey: bounds.dateKey,
        submitted: !!session,
        session,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check status",
    };
  }
}
