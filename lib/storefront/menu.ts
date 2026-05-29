import { db } from "@/lib/db";
import { menuItemVisibilityWhere } from "@/lib/menu/branch-availability";
import { isBlockingSalesWhenOutOfStock } from "@/lib/inventory/sales-stock-policy";
import { filterSellableMenuItemIds } from "@/lib/services/menu-stock-availability";

export type PublicMenuOption = {
  id: string;
  name: string;
  sortOrder: number;
  priceDelta: number;
  sku: string | null;
  isDefault: boolean;
};

export type PublicMenuOptionGroup = {
  id: string;
  name: string;
  sortOrder: number;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  options: PublicMenuOption[];
};

export type PublicMenuItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sku: string;
  price: number;
  category: { id: string; name: string } | null;
  optionGroups: PublicMenuOptionGroup[];
};

type MenuItemRow = Awaited<ReturnType<typeof fetchPublicMenuRows>>[number];

async function fetchPublicMenuRows(
  categoryId?: string | null,
  branchId?: string | null
) {
  return db.menuItem.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(branchId ? menuItemVisibilityWhere(branchId) : {}),
    },
    include: {
      category: {
        select: { id: true, name: true },
      },
      optionGroups: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          options: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              sortOrder: true,
              priceDelta: true,
              sku: true,
              isDefault: true,
            },
          },
        },
      },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });
}

export function mapMenuItemToPublic(item: MenuItemRow): PublicMenuItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    imageUrl: item.imageUrl,
    sku: item.sku,
    price: Number(item.price),
    category: item.category
      ? {
          id: item.category.id,
          name: item.category.name,
        }
      : null,
    optionGroups: item.optionGroups.map((group) => ({
      id: group.id,
      name: group.name,
      sortOrder: group.sortOrder,
      isRequired: group.isRequired,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      options: group.options.map((option) => ({
        id: option.id,
        name: option.name,
        sortOrder: option.sortOrder,
        priceDelta: Number(option.priceDelta),
        sku: option.sku,
        isDefault: option.isDefault,
      })),
    })),
  };
}

export async function getPublicStoreMenu(options?: {
  categoryId?: string | null;
  branchId?: string | null;
}): Promise<PublicMenuItem[]> {
  let items = await fetchPublicMenuRows(
    options?.categoryId,
    options?.branchId
  );

  if (options?.branchId) {
    const blocking = await isBlockingSalesWhenOutOfStock(options.branchId);
    if (blocking && items.length > 0) {
      const sellable = await filterSellableMenuItemIds(
        options.branchId,
        items.map((i) => i.id)
      );
      items = items.filter((i) => sellable.has(i.id));
    }
  }

  return items.map(mapMenuItemToPublic);
}
