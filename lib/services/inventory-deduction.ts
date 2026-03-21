"use server";

import { db } from "@/lib/db";

/**
 * Deduct branch inventory based on MenuItemIngredient recipes when an order/sale is completed.
 * Non-blocking — logs errors but never fails the parent operation.
 *
 * @param items - Array of { menuItemId, quantity } sold
 * @param branchId - The branch where the sale occurred
 * @param reference - A reference string (orderId or transactionId) for audit
 */
export async function deductInventoryForSale(
  items: { menuItemId: string; quantity: number }[],
  branchId: string,
  reference: string
) {
  try {
    if (!items.length || !branchId) return;

    // Collect all unique menu item IDs
    const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];

    // Load recipes for all sold menu items
    const recipes = await db.menuItemIngredient.findMany({
      where: { menuItemId: { in: menuItemIds } },
      include: {
        inventoryItem: {
          select: { id: true, sku: true, branchId: true, currentStock: true },
        },
      },
    });

    if (!recipes.length) return; // No recipes defined — skip deduction

    // Build a map: menuItemId -> ingredient list
    const recipeMap = new Map<
      string,
      Array<{ inventoryItemId: string; sku: string; quantityPerUnit: number }>
    >();
    for (const r of recipes) {
      const list = recipeMap.get(r.menuItemId) || [];
      list.push({
        inventoryItemId: r.inventoryItemId,
        sku: r.inventoryItem?.sku || "",
        quantityPerUnit: Number(r.quantity),
      });
      recipeMap.set(r.menuItemId, list);
    }

    // Aggregate total deductions per inventory SKU for this branch
    const deductions = new Map<string, { sku: string; totalQty: number }>();

    for (const saleItem of items) {
      const ingredients = recipeMap.get(saleItem.menuItemId);
      if (!ingredients) continue;

      for (const ing of ingredients) {
        const deductQty = ing.quantityPerUnit * saleItem.quantity;
        const existing = deductions.get(ing.sku);
        if (existing) {
          existing.totalQty += deductQty;
        } else {
          deductions.set(ing.sku, { sku: ing.sku, totalQty: deductQty });
        }
      }
    }

    if (deductions.size === 0) return;

    // Find matching branch inventory items by SKU
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

    // Deduct stock and create outbound records
    for (const [sku, { totalQty }] of deductions) {
      const branchItem = branchItemMap.get(sku);
      if (!branchItem) continue; // Item doesn't exist in this branch

      // Deduct stock (allow going negative to track over-consumption)
      await db.inventoryItem.update({
        where: { id: branchItem.id },
        data: { currentStock: { decrement: totalQty } },
      });

      // Create outbound record for audit
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

      // Check if stock dropped below reorder point
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

    // Create low stock alerts
    if (lowStockAlerts.length > 0) {
      await createLowStockAlerts(branchId, lowStockAlerts);
    }
  } catch (error) {
    // Non-blocking — log but don't throw
    console.error("[deductInventoryForSale] Error:", error);
  }
}

async function createLowStockAlerts(
  branchId: string,
  items: Array<{ itemId: string; itemName: string; currentStock: number; reorderPoint: number }>
) {
  try {
    for (const item of items) {
      // Avoid duplicate alerts — check if one already exists for this item today
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
