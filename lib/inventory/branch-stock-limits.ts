/** Warehouse item fields used to derive branch min / reorder / max on transfer. */
export type WarehouseItemStockSource = {
  minStock?: number | null;
  reorderPoint?: number | null;
  maxStock?: number | null;
};

/** Branch max when warehouse maxStock is unset: reorderPoint × 5, else 100. */
export function resolveBranchMaxStock(wh: WarehouseItemStockSource): number {
  const explicit = Number(wh.maxStock ?? 0);
  if (explicit > 0) return explicit;
  const rp = Number(wh.reorderPoint) || 0;
  return rp > 0 ? rp * 5 : 100;
}

export function branchLimitsFromWarehouseItem(wh: WarehouseItemStockSource) {
  return {
    minStock: Number(wh.minStock) || 0,
    reorderPoint: Number(wh.reorderPoint) || 10,
    maxStock: resolveBranchMaxStock(wh),
  };
}

/** Persist null when unset or zero (use fallback at transfer). */
export function normalizeWarehouseMaxStock(
  value: number | null | undefined,
): number | null {
  if (value == null || value <= 0) return null;
  return value;
}
