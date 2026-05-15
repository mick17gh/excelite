/** Parse comma-separated category names stored on a kitchen station. */
export function parseStationCategoryNames(categories: string | null | undefined): string[] {
  if (!categories?.trim()) return [];
  return categories
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

/** Serialize selected category names for storage on KitchenStation.categories */
export function serializeStationCategoryNames(names: string[]): string | undefined {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  return unique.length > 0 ? unique.join(", ") : undefined;
}

/**
 * When a station has categories configured, only items in those categories are kitchen-eligible.
 * When none are configured, all items are eligible (backward compatible).
 */
export function stationAcceptsMenuCategory(
  stationCategories: string | null | undefined,
  menuCategoryName: string | null | undefined
): boolean {
  const allowed = parseStationCategoryNames(stationCategories);
  if (allowed.length === 0) return true;
  if (!menuCategoryName?.trim()) return false;
  const normalized = menuCategoryName.trim().toLowerCase();
  return allowed.some((cat) => cat.toLowerCase() === normalized);
}

export type OrderItemWithCategory = {
  id: string;
  menuItem?: { category?: { name: string } | null } | null;
};

export function filterOrderItemsForKitchenStation<T extends OrderItemWithCategory>(
  items: T[],
  stationCategories: string | null | undefined
): T[] {
  const allowed = parseStationCategoryNames(stationCategories);
  if (allowed.length === 0) return items;
  return items.filter((item) =>
    stationAcceptsMenuCategory(stationCategories, item.menuItem?.category?.name ?? null)
  );
}
