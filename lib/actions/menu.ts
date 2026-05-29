"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { UnitType } from "@/lib/generated/prisma/client";
import { MAX_OPTION_GROUPS_PER_MENU_ITEM } from "@/lib/menu-selections";
import {
  menuItemVisibilityWhere,
  resolveOrgBranchIds,
  serializeMenuItemBranchVisibility,
  validateMenuItemBranchScope,
} from "@/lib/menu/branch-availability";
import { isBlockingSalesWhenOutOfStock } from "@/lib/inventory/sales-stock-policy";
import { filterSellableMenuItemIds } from "@/lib/services/menu-stock-availability";

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  error?: string;
}

export interface CreateMenuItemInput {
  name: string;
  sku: string;
  categoryId: string;
  price: number;
  cost?: number;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  availableAtAllBranches?: boolean;
  branchIds?: string[];
  ingredients?: IngredientInput[];
  optionGroups?: MenuItemOptionGroupInput[];
}

export interface UpdateMenuItemInput {
  id: string;
  name?: string;
  sku?: string;
  categoryId?: string;
  price?: number;
  cost?: number;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  availableAtAllBranches?: boolean;
  branchIds?: string[];
  ingredients?: IngredientInput[];
  optionGroups?: MenuItemOptionGroupInput[] | null;
}

export interface IngredientInput {
  inventoryItemId: string;
  quantity: number;
  unit: UnitType;
}

export interface MenuItemOptionInput {
  /** Existing DB id (omit for new options). */
  id?: string;
  name: string;
  sortOrder?: number;
  priceDelta?: number;
  costDelta?: number | null;
  sku?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  ingredients?: IngredientInput[];
}

export interface MenuItemOptionGroupInput {
  /** Existing DB id (omit for new groups). */
  id?: string;
  name: string;
  sortOrder?: number;
  isRequired?: boolean;
  minSelections?: number;
  maxSelections?: number;
  isActive?: boolean;
  options: MenuItemOptionInput[];
}

/** Client form keys use UUIDs (with hyphens); persisted ids are cuids without hyphens. */
function isPersistedMenuKey(key: string | undefined): boolean {
  return Boolean(key && !key.includes("-"));
}

function validateOptionGroupsStructure(
  optionGroups: MenuItemOptionGroupInput[] | undefined
): string | null {
  if (!optionGroups?.length) return null;
  if (optionGroups.length > MAX_OPTION_GROUPS_PER_MENU_ITEM) {
    return `At most ${MAX_OPTION_GROUPS_PER_MENU_ITEM} option groups per product`;
  }
  for (const g of optionGroups) {
    if (!g.name?.trim()) return "Each option group needs a name";
    const isReq = g.isRequired ?? true;
    const minS = isReq ? (g.minSelections ?? 1) : 0;
    const maxS = g.maxSelections ?? 1;
    if (minS < 0 || maxS < 1) return `Invalid min/max selections for group "${g.name}"`;
    if (minS > maxS) return `minSelections cannot exceed maxSelections for "${g.name}"`;
    if (!g.options?.length) return `Group "${g.name}" needs at least one option`;
    for (const o of g.options) {
      if (!o.name?.trim()) return "Each option needs a name";
      if (o.priceDelta !== undefined && o.priceDelta < 0) return "Option price delta cannot be negative";
    }
  }
  return null;
}

/**
 * Ensures option SKUs are unique across the catalog.
 * When updating a menu item, pass `excludeMenuItemId` so this product's existing
 * option rows are ignored — otherwise a false positive happens: update runs
 * deleteMany inside a transaction but this check used `db` and still sees
 * uncommitted rows from the same item.
 */
async function assertMenuItemOptionSkusAvailable(
  groups: MenuItemOptionGroupInput[] | undefined,
  excludeMenuItemId?: string
): Promise<string | null> {
  if (!groups?.length) return null;
  const skus: string[] = [];
  for (const g of groups) {
    for (const o of g.options) {
      const s = o.sku?.trim();
      if (s) skus.push(s.toUpperCase());
    }
  }
  if (skus.length !== new Set(skus).size) return "Duplicate option SKUs in the form";
  if (!skus.length) return null;
  const existing = await db.menuItemOption.findMany({
    where: {
      sku: { in: skus },
      ...(excludeMenuItemId
        ? { group: { menuItemId: { not: excludeMenuItemId } } }
        : {}),
    },
    select: { id: true, sku: true },
  });
  if (existing.length > 0) {
    return `Option SKU already in use: ${existing[0].sku}`;
  }
  return null;
}

async function buildNestedOptionGroupsCreate(optionGroups: MenuItemOptionGroupInput[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const create: any[] = [];
  for (const g of optionGroups) {
    const optionCreates: any[] = [];
    for (const o of g.options) {
      const row: Record<string, unknown> = {
        name: o.name.trim(),
        sortOrder: o.sortOrder ?? 0,
        priceDelta: o.priceDelta ?? 0,
        costDelta: o.costDelta ?? null,
        sku: o.sku?.trim() ? o.sku.trim().toUpperCase() : null,
        isDefault: o.isDefault ?? false,
        isActive: o.isActive ?? true,
      };
      if (o.ingredients?.length) {
        const resolved = await resolveIngredientIds(o.ingredients);
        row.ingredients = {
          create: resolved.map((ing) => ({
            inventoryItemId: ing.inventoryItemId,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
        };
      }
      optionCreates.push(row);
    }
    create.push({
      name: g.name.trim(),
      sortOrder: g.sortOrder ?? 0,
      isRequired: g.isRequired ?? true,
      minSelections: (g.isRequired ?? true) ? (g.minSelections ?? 1) : 0,
      maxSelections: g.maxSelections ?? 1,
      isActive: g.isActive ?? true,
      options: { create: optionCreates },
    });
  }
  return { create };
}

type MenuTx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function syncOptionIngredients(
  tx: MenuTx,
  menuItemOptionId: string,
  ingredients: IngredientInput[] | undefined
) {
  if (ingredients === undefined) return;
  await tx.menuItemOptionIngredient.deleteMany({ where: { menuItemOptionId } });
  if (ingredients.length > 0) {
    const resolved = await resolveIngredientIds(ingredients);
    await tx.menuItemOptionIngredient.createMany({
      data: resolved.map((ing) => ({
        menuItemOptionId,
        inventoryItemId: ing.inventoryItemId,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    });
  }
}

async function removeOrDeactivateOption(
  tx: MenuTx,
  option: { id: string; _count: { orderSelections: number; saleSelections: number } }
) {
  const refs = option._count.orderSelections + option._count.saleSelections;
  if (refs > 0) {
    await tx.menuItemOption.update({
      where: { id: option.id },
      data: { isActive: false },
    });
    return;
  }
  await tx.menuItemOptionIngredient.deleteMany({ where: { menuItemOptionId: option.id } });
  await tx.menuItemOption.delete({ where: { id: option.id } });
}

/** Upsert option groups in place so historical order/sale selections keep valid FKs. */
async function syncMenuItemOptionGroups(
  tx: MenuTx,
  menuItemId: string,
  optionGroups: MenuItemOptionGroupInput[]
) {
  const existing = await tx.menuItemOptionGroup.findMany({
    where: { menuItemId },
    include: {
      options: {
        include: {
          _count: {
            select: { orderSelections: true, saleSelections: true },
          },
        },
      },
    },
  });

  const keptGroupIds = new Set<string>();
  const keptOptionIds = new Set<string>();

  for (const [gi, g] of optionGroups.entries()) {
    const groupData = {
      name: g.name.trim(),
      sortOrder: g.sortOrder ?? gi,
      isRequired: g.isRequired ?? true,
      minSelections: (g.isRequired ?? true) ? (g.minSelections ?? 1) : 0,
      maxSelections: g.maxSelections ?? 1,
      isActive: g.isActive ?? true,
    };

    let groupId: string;
    const existingGroup =
      g.id && isPersistedMenuKey(g.id)
        ? existing.find((eg) => eg.id === g.id)
        : undefined;

    if (existingGroup) {
      groupId = existingGroup.id;
      await tx.menuItemOptionGroup.update({
        where: { id: groupId },
        data: groupData,
      });
    } else {
      const created = await tx.menuItemOptionGroup.create({
        data: { menuItemId, ...groupData },
      });
      groupId = created.id;
    }
    keptGroupIds.add(groupId);

    const groupOptions = existingGroup?.options ?? [];

    for (const [oi, o] of g.options.entries()) {
      const optionData = {
        name: o.name.trim(),
        sortOrder: o.sortOrder ?? oi,
        priceDelta: o.priceDelta ?? 0,
        costDelta: o.costDelta ?? null,
        sku: o.sku?.trim() ? o.sku.trim().toUpperCase() : null,
        isDefault: o.isDefault ?? false,
        isActive: o.isActive ?? true,
      };

      const existingOption =
        o.id && isPersistedMenuKey(o.id)
          ? groupOptions.find((eo) => eo.id === o.id) ??
            existing
              .flatMap((eg) => eg.options)
              .find((eo) => eo.id === o.id)
          : undefined;

      if (existingOption) {
        await tx.menuItemOption.update({
          where: { id: existingOption.id },
          data: { ...optionData, groupId },
        });
        await syncOptionIngredients(tx, existingOption.id, o.ingredients);
        keptOptionIds.add(existingOption.id);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row: any = {
          groupId,
          ...optionData,
        };
        if (o.ingredients?.length) {
          const resolved = await resolveIngredientIds(o.ingredients);
          row.ingredients = {
            create: resolved.map((ing) => ({
              inventoryItemId: ing.inventoryItemId,
              quantity: ing.quantity,
              unit: ing.unit,
            })),
          };
        }
        const created = await tx.menuItemOption.create({ data: row });
        keptOptionIds.add(created.id);
      }
    }
  }

  for (const eg of existing) {
    for (const eo of eg.options) {
      if (!keptOptionIds.has(eo.id)) {
        await removeOrDeactivateOption(tx, eo);
      }
    }
    if (!keptGroupIds.has(eg.id)) {
      const remaining = await tx.menuItemOption.count({ where: { groupId: eg.id } });
      if (remaining === 0) {
        await tx.menuItemOptionGroup.delete({ where: { id: eg.id } });
      } else {
        await tx.menuItemOptionGroup.update({
          where: { id: eg.id },
          data: { isActive: false },
        });
      }
    }
  }
}

function mapOptionGroupsForClient(
  groups:
    | {
        id: string;
        name: string;
        sortOrder: number;
        isRequired: boolean;
        minSelections: number;
        maxSelections: number;
        isActive: boolean;
        options: {
          id: string;
          name: string;
          sortOrder: number;
          priceDelta: unknown;
          costDelta: unknown;
          sku: string | null;
          isDefault: boolean;
          isActive: boolean;
        }[];
      }[]
    | undefined
    | null
) {
  if (!groups?.length) return [];
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    sortOrder: g.sortOrder,
    isRequired: g.isRequired,
    minSelections: g.minSelections,
    maxSelections: g.maxSelections,
    isActive: g.isActive,
    options: g.options.map((o) => ({
      id: o.id,
      name: o.name,
      sortOrder: o.sortOrder,
      priceDelta: Number(o.priceDelta),
      costDelta: o.costDelta != null ? Number(o.costDelta) : null,
      sku: o.sku,
      isDefault: o.isDefault,
      isActive: o.isActive,
    })),
  }));
}

/**
 * Resolve ingredient IDs: the picker may return warehouse item IDs or branch item IDs.
 * This ensures every ingredient points to a valid branch InventoryItem (creating one if needed).
 */
async function resolveIngredientIds(ingredients: IngredientInput[]): Promise<IngredientInput[]> {
  if (!ingredients.length) return [];

  const ids = ingredients.map((i) => i.inventoryItemId);

  // Check which IDs are already valid branch InventoryItems
  const branchItems = await db.inventoryItem.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: { id: true },
  });
  const validBranchIds = new Set(branchItems.map((b) => b.id));

  // IDs that aren't branch items are likely warehouse items
  const warehouseIds = ids.filter((id) => !validBranchIds.has(id));
  if (warehouseIds.length === 0) return ingredients; // all already branch items

  const warehouseItems = await db.warehouseInventoryItem.findMany({
    where: { id: { in: warehouseIds } },
    select: { id: true, name: true, sku: true, categoryId: true, unit: true, unitCost: true, minStock: true, reorderPoint: true },
  });

  // For each warehouse item, find or create a "template" branch InventoryItem
  // We pick the first available branch, or create without branch if none exists
  const warehouseIdToBranchId = new Map<string, string>();

  for (const whItem of warehouseItems) {
    // Find existing branch item with same SKU (any branch)
    let branchItem = await db.inventoryItem.findFirst({
      where: { sku: whItem.sku, deletedAt: null },
      select: { id: true },
    });

    if (!branchItem) {
      // Get a branch to attach this item to
      const branch = await db.branch.findFirst({ where: { isActive: true }, select: { id: true } });
      if (!branch) continue; // can't create without a branch

      branchItem = await db.inventoryItem.create({
        data: {
          name: whItem.name,
          sku: whItem.sku,
          categoryId: whItem.categoryId,
          unit: whItem.unit,
          unitCost: whItem.unitCost,
          currentStock: 0,
          minStock: Number(whItem.minStock),
          maxStock: 1000,
          reorderPoint: Number(whItem.reorderPoint),
          branchId: branch.id,
        },
      });
    }

    warehouseIdToBranchId.set(whItem.id, branchItem.id);
  }

  return ingredients.map((ing) => ({
    ...ing,
    inventoryItemId: warehouseIdToBranchId.get(ing.inventoryItemId) || ing.inventoryItemId,
  }));
}

async function syncMenuItemBranchAvailability(
  menuItemId: string,
  availableAtAllBranches: boolean,
  branchIds: string[]
) {
  await db.$transaction([
    db.menuItemBranch.deleteMany({ where: { menuItemId } }),
    ...(availableAtAllBranches
      ? []
      : [
          db.menuItemBranch.createMany({
            data: branchIds.map((branchId) => ({ menuItemId, branchId })),
          }),
        ]),
    db.menuItem.update({
      where: { id: menuItemId },
      data: { availableAtAllBranches },
    }),
  ]);
}

function mapMenuItemBranchFields(
  item: {
    availableAtAllBranches: boolean;
    branchAvailability: { branchId: string }[];
  }
) {
  const vis = serializeMenuItemBranchVisibility(
    item.availableAtAllBranches,
    item.branchAvailability
  );
  return {
    availableAtAllBranches: vis.availableAtAllBranches,
    branchIds: vis.branchIds,
  };
}

export async function createMenuItem(input: CreateMenuItemInput) {
  try {
    // Input validation
    if (!input.name?.trim()) {
      return { success: false, error: "Menu item name is required" };
    }
    if (!input.sku?.trim()) {
      return { success: false, error: "SKU is required" };
    }
    if (!input.categoryId?.trim()) {
      return { success: false, error: "Category is required" };
    }
    if (input.price <= 0) {
      return { success: false, error: "Price must be greater than 0" };
    }
    if (input.cost !== undefined && input.cost < 0) {
      return { success: false, error: "Cost cannot be negative" };
    }

    const ogErr = validateOptionGroupsStructure(input.optionGroups);
    if (ogErr) {
      return { success: false, error: ogErr };
    }
    const skuErr = await assertMenuItemOptionSkusAvailable(input.optionGroups);
    if (skuErr) {
      return { success: false, error: skuErr };
    }

    const availableAtAllBranches = input.availableAtAllBranches ?? true;
    const scopeErr = validateMenuItemBranchScope(
      availableAtAllBranches,
      input.branchIds
    );
    if (scopeErr) {
      return { success: false, error: scopeErr };
    }
    let resolvedBranchIds: string[] = [];
    if (!availableAtAllBranches) {
      const resolved = await resolveOrgBranchIds(input.branchIds!);
      if (!resolved.ok) {
        return { success: false, error: resolved.error };
      }
      resolvedBranchIds = resolved.ids;
    }

    // Check if SKU already exists
    const existing = await db.menuItem.findUnique({
      where: { sku: input.sku },
    });

    if (existing) {
      return { success: false, error: "SKU already exists" };
    }

    // Calculate cost from ingredients if provided
    let calculatedCost = input.cost;
    let resolvedIngredients: IngredientInput[] = [];
    if (input.ingredients && input.ingredients.length > 0) {
      const costResult = await calculateRecipeCost(input.ingredients);
      if (costResult.success && costResult.cost !== undefined) {
        calculatedCost = costResult.cost;
      }
      resolvedIngredients = await resolveIngredientIds(input.ingredients);
    }

    const item = await db.menuItem.create({
      data: {
        name: input.name.trim(),
        sku: input.sku.trim().toUpperCase(),
        categoryId: input.categoryId,
        price: input.price,
        cost: calculatedCost ?? null,
        description: input.description?.trim(),
        imageUrl: input.imageUrl,
        isActive: input.isActive ?? true,
        availableAtAllBranches,
        ...(resolvedIngredients.length > 0 && {
          ingredients: {
            create: resolvedIngredients.map((ing) => ({
              inventoryItemId: ing.inventoryItemId,
              quantity: ing.quantity,
              unit: ing.unit,
            })),
          },
        }),
        ...(input.optionGroups?.length && {
          optionGroups: await buildNestedOptionGroupsCreate(input.optionGroups),
        }),
        ...(!availableAtAllBranches && {
          branchAvailability: {
            create: resolvedBranchIds.map((branchId) => ({ branchId })),
          },
        }),
      },
      include: {
        category: true,
        branchAvailability: { select: { branchId: true } },
        optionGroups: {
          orderBy: { sortOrder: "asc" },
          include: {
            options: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });

    revalidatePath("/dashboard/menu");
    revalidatePath("/pos");
    return {
      success: true,
      data: {
        ...item,
        category: item.category?.name || "",
        price: Number(item.price),
        cost: item.cost ? Number(item.cost) : null,
        optionGroups: mapOptionGroupsForClient(item.optionGroups),
        ...mapMenuItemBranchFields(item),
      },
    };
  } catch (error) {
    console.error("[createMenuItem] Error:", error);
    return { success: false, error: "Failed to create menu item" };
  }
}

export async function updateMenuItem(input: UpdateMenuItemInput) {
  try {
    const {
      id,
      ingredients,
      optionGroups,
      availableAtAllBranches,
      branchIds,
      ...updateData
    } = input;

    // If SKU is being updated, check for conflicts
    if (updateData.sku) {
      const existing = await db.menuItem.findFirst({
        where: {
          sku: updateData.sku,
          id: { not: id },
        },
      });

      if (existing) {
        return { success: false, error: "SKU already exists" };
      }
    }

    if (optionGroups !== undefined) {
      const ogErr = validateOptionGroupsStructure(optionGroups ?? undefined);
      if (ogErr) {
        return { success: false, error: ogErr };
      }
    }

    let resolvedBranchIds: string[] | undefined;
    if (availableAtAllBranches !== undefined) {
      const scopeErr = validateMenuItemBranchScope(
        availableAtAllBranches,
        branchIds
      );
      if (scopeErr) {
        return { success: false, error: scopeErr };
      }
      if (!availableAtAllBranches) {
        const resolved = await resolveOrgBranchIds(branchIds!);
        if (!resolved.ok) {
          return { success: false, error: resolved.error };
        }
        resolvedBranchIds = resolved.ids;
      } else {
        resolvedBranchIds = [];
      }
    }

    // Calculate cost from ingredients if provided
    let calculatedCost = updateData.cost;
    if (ingredients && ingredients.length > 0) {
      const costResult = await calculateRecipeCost(ingredients);
      if (costResult.success && costResult.cost !== undefined) {
        calculatedCost = costResult.cost;
      }
    }

    // Update ingredients if provided
    if (ingredients !== undefined) {
      // Delete existing ingredients
      await db.menuItemIngredient.deleteMany({
        where: { menuItemId: id },
      });

      // Create new ingredients (resolve warehouse IDs to branch IDs)
      if (ingredients.length > 0) {
        const resolvedIngredients = await resolveIngredientIds(ingredients);
        await db.menuItemIngredient.createMany({
          data: resolvedIngredients.map((ing) => ({
            menuItemId: id,
            inventoryItemId: ing.inventoryItemId,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
        });
      }
    }

    const menuItemScalarUpdate = {
      ...(updateData.name && { name: updateData.name }),
      ...(updateData.sku && { sku: updateData.sku }),
      ...(updateData.categoryId && { categoryId: updateData.categoryId }),
      ...(updateData.price !== undefined && { price: updateData.price }),
      ...(calculatedCost !== undefined && { cost: calculatedCost }),
      ...(updateData.description !== undefined && { description: updateData.description }),
      ...(updateData.imageUrl !== undefined && { imageUrl: updateData.imageUrl }),
      ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
    };

    if (optionGroups !== undefined) {
      const skuErr = await assertMenuItemOptionSkusAvailable(optionGroups ?? undefined, id);
      if (skuErr) {
        return { success: false, error: skuErr };
      }

      await db.$transaction(async (tx) => {
        if (optionGroups && optionGroups.length > 0) {
          await syncMenuItemOptionGroups(tx, id, optionGroups);
        } else {
          const existing = await tx.menuItemOptionGroup.findMany({
            where: { menuItemId: id },
            include: {
              options: {
                include: {
                  _count: {
                    select: { orderSelections: true, saleSelections: true },
                  },
                },
              },
            },
          });
          for (const eg of existing) {
            for (const eo of eg.options) {
              await removeOrDeactivateOption(tx, eo);
            }
            const remaining = await tx.menuItemOption.count({ where: { groupId: eg.id } });
            if (remaining === 0) {
              await tx.menuItemOptionGroup.delete({ where: { id: eg.id } });
            } else {
              await tx.menuItemOptionGroup.update({
                where: { id: eg.id },
                data: { isActive: false },
              });
            }
          }
        }

        if (Object.keys(menuItemScalarUpdate).length > 0) {
          await tx.menuItem.update({
            where: { id },
            data: menuItemScalarUpdate,
          });
        }
      });
    } else {
      if (Object.keys(menuItemScalarUpdate).length > 0) {
        await db.menuItem.update({
          where: { id },
          data: menuItemScalarUpdate,
        });
      }
    }

    if (availableAtAllBranches !== undefined) {
      await syncMenuItemBranchAvailability(
        id,
        availableAtAllBranches,
        resolvedBranchIds ?? []
      );
    }

    const item = await db.menuItem.findUniqueOrThrow({
      where: { id },
      include: {
        branchAvailability: { select: { branchId: true } },
        optionGroups: {
          orderBy: { sortOrder: "asc" },
          include: { options: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    revalidatePath("/dashboard/menu");
    revalidatePath("/pos");
    return {
      success: true,
      data: {
        ...item,
        price: Number(item.price),
        cost: item.cost ? Number(item.cost) : null,
        optionGroups: mapOptionGroupsForClient(item.optionGroups),
        ...mapMenuItemBranchFields(item),
      },
    };
  } catch (error) {
    console.error("[updateMenuItem] Error:", error);
    if (error instanceof Error && error.message.includes("SKU")) {
      return { success: false, error: error.message };
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2003"
    ) {
      return {
        success: false,
        error:
          "Cannot remove options that appear on past orders. Removed options were deactivated instead — try saving again.",
      };
    }
    return { success: false, error: "Failed to update menu item" };
  }
}

export async function deleteMenuItem(id: string) {
  try {
    await db.menuItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/dashboard/menu");
    revalidatePath("/pos");
    return { success: true };
  } catch (error) {
    console.error("[deleteMenuItem] Error:", error);
    return { success: false, error: "Failed to delete menu item" };
  }
}

export async function getMenuItems(
  categoryId?: string,
  includeInactive = false,
  pagination?: PaginationParams,
  branchId?: string
): Promise<PaginatedResult<any>> {
  try {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 1000; // Increased to show all items by default
    const skip = (page - 1) * pageSize;

    const where = {
      deletedAt: null,
      ...(categoryId && { categoryId }),
      ...(!includeInactive && { isActive: true }),
      ...(branchId ? menuItemVisibilityWhere(branchId) : {}),
    };

    const [items, totalItems] = await Promise.all([
      db.menuItem.findMany({
        where,
        include: {
          category: true,
          branchAvailability: { select: { branchId: true } },
          optionGroups: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            include: {
              options: {
                where: { isActive: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
        orderBy: [
          { category: { name: "asc" } },
          { name: "asc" },
        ],
        skip,
        take: pageSize,
      }),
      db.menuItem.count({ where }),
    ]);

    let visibleItems = items;
    if (branchId && items.length > 0) {
      const blocking = await isBlockingSalesWhenOutOfStock(branchId);
      if (blocking) {
        const sellable = await filterSellableMenuItemIds(
          branchId,
          items.map((i) => i.id)
        );
        visibleItems = items.filter((i) => sellable.has(i.id));
      }
    }

    // Convert Decimal fields to plain numbers for client components
    const convertedItems = visibleItems.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      categoryId: item.categoryId,
      category: item.category?.name || "",
      price: Number(item.price),
      cost: Number(item.cost),
      isActive: item.isActive,
      description: item.description,
      imageUrl: item.imageUrl,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      optionGroups: mapOptionGroupsForClient(item.optionGroups),
      ...mapMenuItemBranchFields(item),
    }));

    return {
      success: true,
      data: convertedItems,
      pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  } catch (error) {
    console.error("[getMenuItems] Error:", error);
    return {
      success: false,
      error: "Failed to fetch menu items",
      data: [],
      pagination: { page: 1, pageSize: 1000, totalItems: 0, totalPages: 0 },
    };
  }
}

export async function getMenuItemById(id: string) {
  try {
    const item = await db.menuItem.findUnique({
      where: { id, deletedAt: null },
    });

    if (!item) {
      return { success: false, error: "Menu item not found" };
    }

    return {
      success: true,
      data: {
        ...item,
        price: Number(item.price),
        cost: item.cost ? Number(item.cost) : null,
      },
    };
  } catch (error) {
    console.error("[getMenuItemById] Error:", error);
    return { success: false, error: "Failed to fetch menu item" };
  }
}

export async function getMenuCategories() {
  try {
    const categories = await db.category.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: categories.map((cat) => ({ id: cat.id, name: cat.name })),
    };
  } catch (error) {
    console.error("[getMenuCategories] Error:", error);
    return { success: false, error: "Failed to fetch categories", data: [] };
  }
}

// Get menu item with its ingredients
// Returns warehouse item IDs where possible so the edit form dropdown matches
export async function getMenuItemWithIngredients(menuItemId: string) {
  try {
    const item = await db.menuItem.findUnique({
      where: { id: menuItemId, deletedAt: null },
      include: {
        category: true,
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
        branchAvailability: { select: { branchId: true } },
        optionGroups: {
          orderBy: { sortOrder: "asc" },
          include: {
            options: {
              orderBy: { sortOrder: "asc" },
              include: {
                ingredients: {
                  include: { inventoryItem: true },
                },
              },
            },
          },
        },
      },
    });

    if (!item) {
      return { success: false, error: "Menu item not found" };
    }

    // Resolve branch item SKUs to warehouse item IDs for dropdown matching
    const skus = [
      ...item.ingredients.map((ing) => ing.inventoryItem.sku),
      ...item.optionGroups.flatMap((g) =>
        g.options.flatMap((o) => o.ingredients.map((i) => i.inventoryItem.sku))
      ),
    ];
    const warehouseItems = skus.length
      ? await db.warehouseInventoryItem.findMany({
          where: { sku: { in: skus }, isActive: true },
          select: { id: true, sku: true, unitCost: true },
        })
      : [];
    const skuToWarehouseId = new Map<string, { id: string; unitCost: number }>();
    for (const wh of warehouseItems) {
      if (!skuToWarehouseId.has(wh.sku)) {
        skuToWarehouseId.set(wh.sku, { id: wh.id, unitCost: Number(wh.unitCost) });
      }
    }

    const mapIngRow = (ing: {
      id: string;
      inventoryItemId: string;
      quantity: unknown;
      unit: UnitType;
      inventoryItem: { name: string; sku: string; unitCost: unknown };
    }) => {
      const whMatch = skuToWarehouseId.get(ing.inventoryItem.sku);
      return {
        id: ing.id,
        inventoryItemId: whMatch?.id || ing.inventoryItemId,
        inventoryItemName: ing.inventoryItem.name,
        inventoryItemSku: ing.inventoryItem.sku,
        quantity: Number(ing.quantity),
        unit: ing.unit,
        unitCost: whMatch?.unitCost ?? Number(ing.inventoryItem.unitCost),
        lineCost:
          Number(ing.quantity) * (whMatch?.unitCost ?? Number(ing.inventoryItem.unitCost)),
      };
    };

    return {
      success: true,
      data: {
        id: item.id,
        name: item.name,
        sku: item.sku,
        categoryId: item.categoryId,
        category: item.category?.name || "",
        price: Number(item.price),
        cost: item.cost ? Number(item.cost) : null,
        description: item.description,
        imageUrl: item.imageUrl,
        isActive: item.isActive,
        ...mapMenuItemBranchFields(item),
        ingredients: item.ingredients.map(mapIngRow),
        optionGroups: item.optionGroups.map((g) => ({
          id: g.id,
          name: g.name,
          sortOrder: g.sortOrder,
          isRequired: g.isRequired,
          minSelections: g.minSelections,
          maxSelections: g.maxSelections,
          isActive: g.isActive,
          options: g.options.map((o) => ({
            id: o.id,
            name: o.name,
            sortOrder: o.sortOrder,
            priceDelta: Number(o.priceDelta),
            costDelta: o.costDelta != null ? Number(o.costDelta) : null,
            sku: o.sku,
            isDefault: o.isDefault,
            isActive: o.isActive,
            ingredients: o.ingredients.map(mapIngRow),
          })),
        })),
      },
    };
  } catch (error) {
    console.error("[getMenuItemWithIngredients] Error:", error);
    return { success: false, error: "Failed to fetch menu item" };
  }
}

// Calculate recipe cost from ingredients (checks warehouse then branch items)
export async function calculateRecipeCost(ingredients: IngredientInput[]) {
  try {
    if (!ingredients || ingredients.length === 0) {
      return { success: true, cost: 0 };
    }

    const ids = ingredients.map((ing) => ing.inventoryItemId);

    // Try warehouse items first
    const whItems = await db.warehouseInventoryItem.findMany({
      where: { id: { in: ids } },
      select: { id: true, unitCost: true },
    });
    const costMap = new Map(whItems.map((i) => [i.id, Number(i.unitCost)]));

    // Fall back to branch items for any IDs not found in warehouse
    const missingIds = ids.filter((id) => !costMap.has(id));
    if (missingIds.length > 0) {
      const branchItems = await db.inventoryItem.findMany({
        where: { id: { in: missingIds } },
        select: { id: true, unitCost: true },
      });
      for (const item of branchItems) {
        costMap.set(item.id, Number(item.unitCost));
      }
    }

    let totalCost = 0;
    for (const ing of ingredients) {
      const unitCost = costMap.get(ing.inventoryItemId) || 0;
      totalCost += ing.quantity * unitCost;
    }

    return { success: true, cost: Math.round(totalCost * 100) / 100 };
  } catch (error) {
    console.error("[calculateRecipeCost] Error:", error);
    return { success: false, error: "Failed to calculate cost" };
  }
}

// Get inventory items for ingredient selection — pulls from warehouse (source of truth)
export async function getInventoryItemsForIngredients() {
  try {
    // Primary source: warehouse inventory items
    const warehouseItems = await db.warehouseInventoryItem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        unitCost: true,
        category: { select: { name: true } },
      },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    });

    // Dedupe by SKU (in case multiple warehouses have same SKU)
    const uniqueItems = new Map<string, { id: string; name: string; sku: string; unit: string; unitCost: number; category: string }>();
    for (const item of warehouseItems) {
      if (!uniqueItems.has(item.sku)) {
        uniqueItems.set(item.sku, {
          id: item.id,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
          unitCost: Number(item.unitCost),
          category: item.category.name,
        });
      }
    }

    // Fallback: also include branch-only items not in warehouse (legacy data)
    const branchItems = await db.inventoryItem.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        sku: { notIn: [...uniqueItems.keys()] },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        unitCost: true,
        category: { select: { name: true } },
      },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    });

    const branchUnique = new Map<string, typeof branchItems[0]>();
    for (const item of branchItems) {
      if (!branchUnique.has(item.sku)) branchUnique.set(item.sku, item);
    }
    for (const [, item] of branchUnique) {
      uniqueItems.set(item.sku, {
        id: item.id,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        unitCost: Number(item.unitCost),
        category: item.category.name,
      });
    }

    return {
      success: true,
      data: Array.from(uniqueItems.values()),
    };
  } catch (error) {
    console.error("[getInventoryItemsForIngredients] Error:", error);
    return { success: false, error: "Failed to fetch inventory items", data: [] };
  }
}

// Add ingredient to menu item
export async function addIngredientToMenuItem(
  menuItemId: string,
  ingredient: IngredientInput
) {
  try {
    const [resolved] = await resolveIngredientIds([ingredient]);
    await db.menuItemIngredient.create({
      data: {
        menuItemId,
        inventoryItemId: resolved.inventoryItemId,
        quantity: resolved.quantity,
        unit: resolved.unit,
      },
    });

    // Recalculate and update menu item cost
    const allIngredients = await db.menuItemIngredient.findMany({
      where: { menuItemId },
      include: { inventoryItem: true },
    });

    const totalCost = allIngredients.reduce((sum, ing) => {
      return sum + Number(ing.quantity) * Number(ing.inventoryItem.unitCost);
    }, 0);

    await db.menuItem.update({
      where: { id: menuItemId },
      data: { cost: totalCost },
    });

    revalidatePath("/dashboard/menu");
    return { success: true };
  } catch (error) {
    console.error("[addIngredientToMenuItem] Error:", error);
    return { success: false, error: "Failed to add ingredient" };
  }
}

// Remove ingredient from menu item
export async function removeIngredientFromMenuItem(ingredientId: string) {
  try {
    const ingredient = await db.menuItemIngredient.findUnique({
      where: { id: ingredientId },
    });

    if (!ingredient) {
      return { success: false, error: "Ingredient not found" };
    }

    await db.menuItemIngredient.delete({
      where: { id: ingredientId },
    });

    // Recalculate and update menu item cost
    const remainingIngredients = await db.menuItemIngredient.findMany({
      where: { menuItemId: ingredient.menuItemId },
      include: { inventoryItem: true },
    });

    const totalCost = remainingIngredients.reduce((sum, ing) => {
      return sum + Number(ing.quantity) * Number(ing.inventoryItem.unitCost);
    }, 0);

    await db.menuItem.update({
      where: { id: ingredient.menuItemId },
      data: { cost: totalCost },
    });

    revalidatePath("/dashboard/menu");
    return { success: true };
  } catch (error) {
    console.error("[removeIngredientFromMenuItem] Error:", error);
    return { success: false, error: "Failed to remove ingredient" };
  }
}
