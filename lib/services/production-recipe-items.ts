export type ProductionItemStage = "RAW" | "PROCESSED" | "BRANCH_READY";

export interface WarehouseItemForRecipe {
  id: string;
  itemStage: ProductionItemStage;
}

/** Finished goods produced by a batch (e.g. portions for branch dispatch). */
export function isRecipeOutputItem(item: WarehouseItemForRecipe): boolean {
  return item.itemStage === "BRANCH_READY";
}

/** Bulk or work-in-progress inputs consumed when producing output. */
export function isRecipeIngredientItem(
  item: WarehouseItemForRecipe,
  excludeItemId?: string,
): boolean {
  if (excludeItemId && item.id === excludeItemId) return false;
  return item.itemStage === "RAW" || item.itemStage === "PROCESSED";
}
