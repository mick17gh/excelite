import { db } from "@/lib/db";
import { applyDefaultMenuItemSelections } from "@/lib/menu-selections";
import { isBlockingSalesWhenOutOfStock } from "@/lib/inventory/sales-stock-policy";

export type StockCheckLine = {
  menuItemId: string;
  quantity: number;
  menuItemOptionIds?: string[];
  menuItemName?: string;
};

export type StockShortage = {
  sku: string;
  name: string;
  required: number;
  available: number;
};

export type StockCheckResult = {
  sellable: boolean;
  shortages: StockShortage[];
};

async function aggregateSkuRequirements(
  lines: StockCheckLine[]
): Promise<Map<string, { sku: string; totalQty: number }>> {
  const menuItemIds = [...new Set(lines.map((l) => l.menuItemId))];

  const linesWithOptions = await Promise.all(
    lines.map(async (line) => ({
      ...line,
      optionIds: await applyDefaultMenuItemSelections(line.menuItemId, line.menuItemOptionIds),
    }))
  );

  const allOptionIds = [...new Set(linesWithOptions.flatMap((l) => l.optionIds))];

  const [baseRecipes, optionRecipes] = await Promise.all([
    db.menuItemIngredient.findMany({
      where: { menuItemId: { in: menuItemIds } },
      include: {
        inventoryItem: { select: { sku: true } },
      },
    }),
    allOptionIds.length
      ? db.menuItemOptionIngredient.findMany({
          where: { menuItemOptionId: { in: allOptionIds } },
          include: {
            inventoryItem: { select: { sku: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const baseMap = new Map<string, Array<{ sku: string; quantityPerUnit: number }>>();
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

  const deductions = new Map<string, number>();

  for (const line of linesWithOptions) {
    const q = line.quantity;
    const base = baseMap.get(line.menuItemId) || [];
    for (const ing of base) {
      if (!ing.sku) continue;
      deductions.set(ing.sku, (deductions.get(ing.sku) || 0) + ing.quantityPerUnit * q);
    }
    for (const oid of line.optionIds) {
      const extras = optionMap.get(oid) || [];
      for (const ing of extras) {
        if (!ing.sku) continue;
        deductions.set(ing.sku, (deductions.get(ing.sku) || 0) + ing.quantityPerUnit * q);
      }
    }
  }

  const result = new Map<string, { sku: string; totalQty: number }>();
  for (const [sku, totalQty] of deductions) {
    result.set(sku, { sku, totalQty });
  }
  return result;
}

async function checkSkuAvailability(
  branchId: string,
  skuRequirements: Map<string, { sku: string; totalQty: number }>
): Promise<StockShortage[]> {
  if (skuRequirements.size === 0) return [];

  const skus = [...skuRequirements.keys()];
  const branchItems = await db.inventoryItem.findMany({
    where: { branchId, sku: { in: skus }, deletedAt: null, isActive: true },
    select: { sku: true, name: true, currentStock: true },
  });
  const bySku = new Map(branchItems.map((i) => [i.sku, i]));

  const shortages: StockShortage[] = [];
  for (const [sku, { totalQty }] of skuRequirements) {
    const item = bySku.get(sku);
    const available = item ? Number(item.currentStock) : 0;
    if (available < totalQty) {
      shortages.push({
        sku,
        name: item?.name || sku,
        required: totalQty,
        available,
      });
    }
  }
  return shortages;
}

/** Check a single menu item (qty 1) with optional explicit option IDs. */
export async function checkMenuItemStock(
  branchId: string,
  menuItemId: string,
  quantity = 1,
  menuItemOptionIds?: string[]
): Promise<StockCheckResult> {
  const blocking = await isBlockingSalesWhenOutOfStock(branchId);
  if (!blocking) return { sellable: true, shortages: [] };

  const skuReq = await aggregateSkuRequirements([
    { menuItemId, quantity, menuItemOptionIds },
  ]);
  const shortages = await checkSkuAvailability(branchId, skuReq);
  return { sellable: shortages.length === 0, shortages };
}

/** Check cart lines with aggregated SKU demand. */
export async function checkCartStockAvailable(
  branchId: string,
  lines: StockCheckLine[]
): Promise<StockCheckResult & { message?: string }> {
  const blocking = await isBlockingSalesWhenOutOfStock(branchId);
  if (!blocking) return { sellable: true, shortages: [] };

  if (!lines.length) return { sellable: true, shortages: [] };

  const skuReq = await aggregateSkuRequirements(lines);
  const shortages = await checkSkuAvailability(branchId, skuReq);

  if (shortages.length === 0) {
    return { sellable: true, shortages: [] };
  }

  const first = shortages[0];
  const lineName = lines.find((l) => l.menuItemName)?.menuItemName;
  const message = lineName
    ? `Cannot sell ${lineName}: insufficient ${first.name} at this branch (need ${first.required}, have ${first.available})`
    : `Insufficient ${first.name} at this branch (need ${first.required}, have ${first.available})`;

  return { sellable: false, shortages, message };
}

/** Menu items sellable at branch when blocking is on (default option config, qty 1). */
export async function filterSellableMenuItemIds(
  branchId: string,
  menuItemIds: string[]
): Promise<Set<string>> {
  const blocking = await isBlockingSalesWhenOutOfStock(branchId);
  if (!blocking) return new Set(menuItemIds);

  const sellable = new Set<string>();
  await Promise.all(
    menuItemIds.map(async (id) => {
      const result = await checkMenuItemStock(branchId, id, 1);
      if (result.sellable) sellable.add(id);
    })
  );
  return sellable;
}

export async function assertCartStockAvailable(
  branchId: string,
  lines: StockCheckLine[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await checkCartStockAvailable(branchId, lines);
  if (result.sellable) return { ok: true };
  return { ok: false, error: result.message || "Insufficient stock for one or more items" };
}
