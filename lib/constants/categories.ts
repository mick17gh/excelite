export interface InventoryCategoryOption {
  id: string;
  name: string;
  code: string;
  isActive?: boolean;
}

export function getCategoryLabel(category: Pick<InventoryCategoryOption, "name">): string {
  return category.name;
}
