"use server";

import { db } from "@/lib/db";

export type SaleDeductionLine = {
  menuItemId: string;
  quantity: number;
  menuItemOptionIds?: string[];
};

/**
 * Deduct branch inventory from base MenuItemIngredient recipes plus optional
 * MenuItemOptionIngredient deltas for each selected option.
 */
export async function deductInventoryForSale(
  items: SaleDeductionLine[],
  branchId: string,
  reference: string
) {
  try {
    if (!items.length || !branchId) return;

    const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
    const allOptionIds = [...new Set(items.flatMap((i) => i.menuItemOptionIds || []))];

    const [baseRecipes, optionRecipes] = await Promise.all([
      db.menuItemIngredient.findMany({
        where: { menuItemId: { in: menuItemIds } },
        include: {
          inventoryItem: {
            select: { id: true, sku: true, branchId: true, currentStock: true },
          },
        },
      }),
      allOptionIds.length
        ? db.menuItemOptionIngredient.findMany({
            where: { menuItemOptionId: { in: allOptionIds } },
            include: {
              inventoryItem: {
                select: { id: true, sku: true, branchId: true, currentStock: true },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const baseMap = new Map<
      string,
      Array<{ sku: string; quantityPerUnit: number }>
    >();
    for (const r of baseRecipes) {
      const list = baseMap.get(r.menuItemId) || [];
      list.push({
        sku: r.inventoryItem?.sku || "",
        quantityPerUnit: Number(r.quantity),
      });
      baseMap.set(r.menuItemId, list);
    }

    const optionMap = new Map<string, Array<{ sku: string; quantityPerUnit: number }>>();
    for (const r of optionRecipes) {
      const list = optionMap.get(r.menuItemOptionId) || [];
      list.push({
        sku: r.inventoryItem?.sku || "",
        quantityPerUnit: Number(r.quantity),
      });
      optionMap.set(r.menuItemOptionId, list);
    }

    const deductions = new Map<string, { sku: string; totalQty: number }>();

    for (const line of items) {
      const q = line.quantity;
      const base = baseMap.get(line.menuItemId) || [];
      for (const ing of base) {
        if (!ing.sku) continue;
        const deductQty = ing.quantityPerUnit * q;
        const cur = deductions.get(ing.sku);
        if (cur) cur.totalQty += deductQty;
        else deductions.set(ing.sku, { sku: ing.sku, totalQty: deductQty });
      }
      for (const oid of line.menuItemOptionIds || []) {
        const extras = optionMap.get(oid) || [];
        for (const ing of extras) {
          if (!ing.sku) continue;
          const deductQty = ing.quantityPerUnit * q;
          const cur = deductions.get(ing.sku);
          if (cur) cur.totalQty += deductQty;
          else deductions.set(ing.sku, { sku: ing.sku, totalQty: deductQty });
        }
      }
    }

    if (deductions.size === 0) return;

    const skus = [...deductions.keys()];
    const branchItems = await db.inventoryItem.findMany({
      where: {
        branchId,
        sku: { in: skus },
        deletedAt: null,
      },
      select: { id: true, sku: true, currentStock: true, reorderPoint: true, name: true },
    });

    const branchItemMap = new Map(branchItems.map((bi) => [bi.sku, bi]));

    const lowStockAlerts: Array<{ itemId: string; itemName: string; currentStock: number; reorderPoint: number }> = [];

    for (const [sku, { totalQty }] of deductions) {
      const branchItem = branchItemMap.get(sku);
      if (!branchItem) continue;

      await db.inventoryItem.update({
        where: { id: branchItem.id },
        data: { currentStock: { decrement: totalQty } },
      });

      await db.outboundStock.create({
        data: {
          branchId,
          itemId: branchItem.id,
          quantity: totalQty,
          movementType: "OUTBOUND_SALE",
          reason: "Auto-deducted from sale",
          reference,
        },
      });

      const newStock = Number(branchItem.currentStock) - totalQty;
      if (newStock <= Number(branchItem.reorderPoint)) {
        lowStockAlerts.push({
          itemId: branchItem.id,
          itemName: branchItem.name,
          currentStock: newStock,
          reorderPoint: Number(branchItem.reorderPoint),
        });
      }
    }

    if (lowStockAlerts.length > 0) {
      await createLowStockAlerts(branchId, lowStockAlerts);
    }
  } catch (error) {
    console.error("[deductInventoryForSale] Error:", error);
  }
}

async function createLowStockAlerts(
  branchId: string,
  items: Array<{ itemId: string; itemName: string; currentStock: number; reorderPoint: number }>
) {
  try {
    for (const item of items) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existing = await db.alert.findFirst({
        where: {
          branchId,
          type: "LOW_STOCK",
          createdAt: { gte: today },
          data: { path: ["itemId"], equals: item.itemId },
        },
      });

      if (existing) continue;

      await db.alert.create({
        data: {
          branchId,
          type: "LOW_STOCK",
          severity: item.currentStock <= 0 ? "CRITICAL" : "HIGH",
          title: `Low stock: ${item.itemName}`,
          message: `${item.itemName} is at ${item.currentStock.toFixed(1)} units (reorder point: ${item.reorderPoint})`,
          data: { itemId: item.itemId, currentStock: item.currentStock, reorderPoint: item.reorderPoint },
        },
      });
    }
  } catch (error) {
    console.error("[createLowStockAlerts] Error:", error);
  }
}
