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

export type RecipeIngredientLineSummary = {
  ingredientItemId: string;
  quantity: number;
  ingredientItem?: { name: string; sku: string; unit: string };
};

/** One-line summary for lists and combobox descriptions. */
export function formatRecipeIngredientSummary(
  lines: RecipeIngredientLineSummary[],
  options?: { maxItems?: number },
): string {
  if (!lines.length) return "No ingredients";
  const max = options?.maxItems ?? lines.length;
  const parts = lines.slice(0, max).map((line) => {
    const label = line.ingredientItem?.name || line.ingredientItem?.sku || "Item";
    const unit = line.ingredientItem?.unit ?? "";
    return `${label}: ${line.quantity}${unit ? ` ${unit}` : ""}`;
  });
  if (lines.length > max) parts.push(`+${lines.length - max} more`);
  return parts.join(" · ");
}
