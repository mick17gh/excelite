"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logCreate, logUpdate, logDelete } from "@/lib/services/audit";
import { UnitType } from "@/lib/generated/prisma/client";
import type {
  BulkMenuItemInput,
  BulkInventoryItemInput,
  BulkCategoryInput,
  BulkSupplierInput,
  BulkStaffInput,
  BulkMenuOptionRow,
} from "@/lib/utils/bulk-import";
import { updateMenuItem } from "@/lib/actions/menu";
import type { MenuItemOptionGroupInput } from "@/lib/actions/menu";

// =====================================
// MENU BULK OPERATIONS
// =====================================

export async function bulkCreateMenuItems(items: BulkMenuItemInput[]) {
  try {
    if (!items || items.length === 0) {
      return { success: false, error: "No items provided" };
    }

    // Generate SKUs for items without one
    const itemsWithSkus = items.map((item, index) => ({
      ...item,
      sku: item.sku || `SKU-${Date.now().toString(36).toUpperCase()}${index.toString().padStart(3, "0")}`,
      isActive: item.isActive ?? true,
      cost: item.cost ?? 0,
    }));

    // Get all categories to map names to IDs
    const allCategories = await db.category.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    });

    const categoryNameToId = new Map(allCategories.map((c) => [c.name.toLowerCase(), c.id]));
    const categoryIdSet = new Set(allCategories.map((c) => c.id));

    // Map category names to IDs and validate
    const itemsWithValidCategories = itemsWithSkus.map((item) => {
      let categoryId = item.categoryId;
      
      // If categoryId is not a valid ID, try to find by name
      if (!categoryIdSet.has(categoryId)) {
        const mappedId = categoryNameToId.get(categoryId.toLowerCase());
        if (mappedId) {
          categoryId = mappedId;
        }
      }
      
      return { ...item, categoryId };
    });

    // Validate all categories exist
    const invalidCategories = itemsWithValidCategories.filter((i) => !categoryIdSet.has(i.categoryId));

    if (invalidCategories.length > 0) {
      const invalidCategoryNames = [...new Set(invalidCategories.map((i) => i.categoryId))];
      return {
        success: false,
        error: `Invalid categories: ${invalidCategoryNames.join(", ")}. Please ensure all categories exist before importing menu items.`,
      };
    }

    // Check for duplicate SKUs
    const existingSkus = await db.menuItem.findMany({
      where: {
        sku: { in: itemsWithSkus.map((i) => i.sku) },
      },
      select: { sku: true },
    });

    const existingSkuSet = new Set(existingSkus.map((s) => s.sku));
    const duplicates = itemsWithSkus.filter((i) => existingSkuSet.has(i.sku));

    if (duplicates.length > 0) {
      return {
        success: false,
        error: `Duplicate SKUs found: ${duplicates.map((d) => d.sku).join(", ")}`,
      };
    }

    const result = await db.menuItem.createMany({
      data: itemsWithValidCategories,
    });

    // Log bulk creation
    await logCreate("MenuItem", "BULK", {
      action: "BULK_CREATE",
      count: result.count,
      categoryIds: [...new Set(items.map((i) => i.categoryId))],
    });

    revalidatePath("/dashboard/menu");
    return { success: true, created: result.count };
  } catch (error) {
    console.error("[bulkCreateMenuItems] Error:", error);
    return { success: false, error: "Failed to create menu items" };
  }
}

function bulkMenuOptionRowsToGroupInputs(rows: BulkMenuOptionRow[]): MenuItemOptionGroupInput[] {
  const sorted = [...rows].sort((a, b) => {
    const ga = a.groupSortOrder ?? 0;
    const gb = b.groupSortOrder ?? 0;
    if (ga !== gb) return ga - gb;
    const oa = a.optionSortOrder ?? 0;
    const ob = b.optionSortOrder ?? 0;
    if (oa !== ob) return oa - ob;
    return a.optionName.localeCompare(b.optionName);
  });
  const groups: MenuItemOptionGroupInput[] = [];
  const indexByName = new Map<string, number>();
  for (const r of sorted) {
    const gname = r.groupName.trim();
    let idx = indexByName.get(gname);
    if (idx === undefined) {
      const isReq = r.isRequired ?? true;
      const minS = isReq ? (r.minSelections ?? 1) : 0;
      const maxS = Math.max(1, r.maxSelections ?? 1);
      groups.push({
        name: gname,
        sortOrder: r.groupSortOrder ?? groups.length,
        isRequired: isReq,
        minSelections: minS,
        maxSelections: maxS,
        isActive: true,
        options: [],
      });
      idx = groups.length - 1;
      indexByName.set(gname, idx);
    }
    const g = groups[idx];
    g.options.push({
      name: r.optionName.trim(),
      sortOrder: r.optionSortOrder ?? g.options.length,
      priceDelta: r.priceDelta ?? 0,
      costDelta: r.costDelta != null && Number.isFinite(r.costDelta) ? r.costDelta : null,
      sku: r.optionSku?.trim() ? r.optionSku.trim().toUpperCase() : null,
      isDefault: r.isDefault ?? false,
      isActive: true,
    });
  }
  return groups;
}

export async function bulkUpsertMenuItemOptionGroups(rows: BulkMenuOptionRow[]) {
  try {
    if (!rows?.length) {
      return { success: false, error: "No rows provided" };
    }
    const bySku = new Map<string, BulkMenuOptionRow[]>();
    for (const r of rows) {
      const sku = r.menuItemSku.trim().toUpperCase();
      const arr = bySku.get(sku) || [];
      arr.push(r);
      bySku.set(sku, arr);
    }
    let updated = 0;
    for (const [sku, list] of bySku.entries()) {
      const menuItem = await db.menuItem.findFirst({
        where: { sku, deletedAt: null },
      });
      if (!menuItem) {
        return { success: false, error: `Unknown product SKU: ${sku}` };
      }
      const optionGroups = bulkMenuOptionRowsToGroupInputs(list);
      const res = await updateMenuItem({ id: menuItem.id, optionGroups });
      if (!res.success) {
        return { success: false, error: res.error || `Failed for SKU ${sku}` };
      }
      updated += 1;
    }

    await logUpdate("MenuItem", "BULK", {}, {
      action: "BULK_UPSERT_OPTION_GROUPS",
      products: updated,
    });

    revalidatePath("/dashboard/menu");
    revalidatePath("/pos");
    return { success: true, updated };
  } catch (error) {
    console.error("[bulkUpsertMenuItemOptionGroups] Error:", error);
    return { success: false, error: "Failed to import menu option groups" };
  }
}

export async function bulkUpdateMenuItems(
  updates: Array<{ id: string; data: Partial<BulkMenuItemInput> }>
) {
  try {
    if (!updates || updates.length === 0) {
      return { success: false, error: "No updates provided" };
    }

    const results = await Promise.all(
      updates.map(async ({ id, data }) => {
        try {
          await db.menuItem.update({
            where: { id },
            data,
          });
          return { id, success: true };
        } catch {
          return { id, success: false };
        }
      })
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    await logUpdate("MenuItem", "BULK", {}, {
      action: "BULK_UPDATE",
      total: updates.length,
      successful,
      failed,
    });

    revalidatePath("/dashboard/menu");
    return { success: true, updated: successful, failed };
  } catch (error) {
    console.error("[bulkUpdateMenuItems] Error:", error);
    return { success: false, error: "Failed to update menu items" };
  }
}

export async function bulkDeleteMenuItems(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: "No items to delete" };
    }

    // Soft delete
    const result = await db.menuItem.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date(), isActive: false },
    });

    await logDelete("MenuItem", "BULK", {
      action: "BULK_DELETE",
      count: result.count,
      ids,
    });

    revalidatePath("/dashboard/menu");
    return { success: true, deleted: result.count };
  } catch (error) {
    console.error("[bulkDeleteMenuItems] Error:", error);
    return { success: false, error: "Failed to delete menu items" };
  }
}

export async function bulkUpdateMenuPrices(
  categoryOrIds: string | string[],
  adjustment: { type: "percentage" | "fixed"; value: number }
) {
  try {
    // Get items to update
    const where = Array.isArray(categoryOrIds)
      ? { id: { in: categoryOrIds }, deletedAt: null }
      : { categoryId: categoryOrIds, deletedAt: null };

    const items = await db.menuItem.findMany({
      where,
      select: { id: true, price: true, name: true },
    });

    if (items.length === 0) {
      return { success: false, error: "No items found to update" };
    }

    // Calculate new prices
    const updates = items.map((item) => {
      let newPrice = Number(item.price);
      if (adjustment.type === "percentage") {
        newPrice = newPrice * (1 + adjustment.value / 100);
      } else {
        newPrice = newPrice + adjustment.value;
      }
      return {
        id: item.id,
        oldPrice: Number(item.price),
        newPrice: Math.round(newPrice * 100) / 100,
      };
    });

    // Apply updates
    await Promise.all(
      updates.map(({ id, newPrice }) =>
        db.menuItem.update({
          where: { id },
          data: { price: newPrice },
        })
      )
    );

    await logUpdate("MenuItem", "BULK_PRICE", {}, {
      action: "BULK_PRICE_UPDATE",
      adjustment,
      count: updates.length,
      sample: updates.slice(0, 5),
    });

    revalidatePath("/dashboard/menu");
    return {
      success: true,
      updated: updates.length,
      adjustments: updates.slice(0, 10), // Return first 10 for reference
    };
  } catch (error) {
    console.error("[bulkUpdateMenuPrices] Error:", error);
    return { success: false, error: "Failed to update prices" };
  }
}

// =====================================
// INVENTORY BULK OPERATIONS
// =====================================

// Map human-readable unit names to UnitType enum values
function mapToUnitType(unit: string): UnitType {
  const unitMap: Record<string, UnitType> = {
    kg: UnitType.KG,
    kilogram: UnitType.KG,
    kilograms: UnitType.KG,
    gram: UnitType.GRAM,
    grams: UnitType.GRAM,
    g: UnitType.GRAM,
    liter: UnitType.LITER,
    litre: UnitType.LITER,
    liters: UnitType.LITER,
    litres: UnitType.LITER,
    l: UnitType.LITER,
    ml: UnitType.ML,
    milliliter: UnitType.ML,
    milliliters: UnitType.ML,
    piece: UnitType.PIECE,
    pieces: UnitType.PIECE,
    pcs: UnitType.PIECE,
    box: UnitType.BOX,
    boxes: UnitType.BOX,
    case: UnitType.CASE,
    cases: UnitType.CASE,
    pack: UnitType.PACK,
    packs: UnitType.PACK,
    roll: UnitType.PIECE,
    rolls: UnitType.PIECE,
  };
  const normalized = unit.toLowerCase().trim();
  return unitMap[normalized] || UnitType.PIECE;
}

export async function bulkCreateInventoryItems(items: BulkInventoryItemInput[]) {
  try {
    if (!items || items.length === 0) {
      return { success: false, error: "No items provided" };
    }

    // Resolve organization-scoped inventory categories by name/code
    const branchIds = [...new Set(items.map((i) => i.branchId))];
    const branches = await db.branch.findMany({
      where: { id: { in: branchIds } },
      select: { id: true, organizationId: true },
    });
    const branchOrg = new Map(branches.map((b) => [b.id, b.organizationId]));
    const orgIds = [
      ...new Set(
        branches
          .map((b) => b.organizationId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const categories = await db.inventoryCategoryMaster.findMany({
      where: { organizationId: { in: orgIds }, deletedAt: null, isActive: true },
      select: { id: true, organizationId: true, name: true, code: true },
    });
    const categoryByOrg = new Map<string, Map<string, string>>();
    for (const c of categories) {
      const keyName = c.name.trim().toLowerCase();
      const keyCode = c.code.trim().toLowerCase();
      if (!categoryByOrg.has(c.organizationId)) {
        categoryByOrg.set(c.organizationId, new Map());
      }
      categoryByOrg.get(c.organizationId)!.set(keyName, c.id);
      categoryByOrg.get(c.organizationId)!.set(keyCode, c.id);
    }

    const invalidCategories = items
      .map((item, index) => {
        const orgId = branchOrg.get(item.branchId);
        const key = item.category.trim().toLowerCase();
        const categoryId = orgId ? categoryByOrg.get(orgId)?.get(key) : undefined;
        return categoryId ? null : `row ${index + 1}: "${item.category}"`;
      })
      .filter(Boolean) as string[];
    if (invalidCategories.length > 0) {
      return {
        success: false,
        error: `Unknown inventory category for ${invalidCategories.join(", ")}`,
      };
    }

    // Check for existing items with same SKU and branch combination
    const skuBranchPairs = items.map(item => ({
      sku: item.sku || `INV-${Date.now().toString(36).toUpperCase()}`,
      branchId: item.branchId
    }));

    const existingItems = await db.inventoryItem.findMany({
      where: {
        OR: skuBranchPairs.map(pair => ({
          sku: pair.sku,
          branchId: pair.branchId
        }))
      },
      select: { sku: true, branchId: true }
    });

    const existingSkuBranchSet = new Set(
      existingItems.map(item => `${item.sku}-${item.branchId}`)
    );

    // Filter out items that already exist and generate unique SKUs for duplicates
    const itemsWithDefaults = items
      .map((item, index) => {
        let sku = item.sku || `INV-${Date.now().toString(36).toUpperCase()}${index.toString().padStart(3, "0")}`;
        const skuBranchKey = `${sku}-${item.branchId}`;
        
        // If this SKU-branch combination already exists, generate a new unique SKU
        if (existingSkuBranchSet.has(skuBranchKey)) {
          sku = `${sku}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
        }

        return {
          ...item,
          sku,
          categoryId: categoryByOrg
            .get(branchOrg.get(item.branchId) || "")
            ?.get(item.category.trim().toLowerCase()) as string,
          unit: mapToUnitType(item.unit),
          currentStock: item.currentStock ?? 0,
          minStock: item.minStock ?? 10,
          maxStock: item.maxStock ?? 100,
          reorderPoint: item.reorderPoint ?? 20,
          isActive: true,
        };
      });

    console.log(`[bulkCreateInventoryItems] Processing ${items.length} items`);
    console.log(`[bulkCreateInventoryItems] After processing: ${itemsWithDefaults.length} items ready for import`);

    const result = await db.inventoryItem.createMany({
      data: itemsWithDefaults,
    });

    console.log(`[bulkCreateInventoryItems] Successfully created ${result.count} items`);

    await logCreate("InventoryItem", "BULK", {
      action: "BULK_CREATE",
      count: result.count,
      inputCount: items.length,
      processedCount: itemsWithDefaults.length,
      branches: [...new Set(items.map((i) => i.branchId))],
    });

    revalidatePath("/dashboard/inventory");
    return { 
      success: true, 
      created: result.count,
      inputCount: items.length,
      message: result.count < items.length ? 
        `Created ${result.count} items out of ${items.length} provided. Some items may have been filtered due to validation issues.` :
        `Successfully created all ${result.count} items.`
    };
  } catch (error) {
    console.error("[bulkCreateInventoryItems] Error:", error);
    return { success: false, error: "Failed to create inventory items" };
  }
}

export async function bulkUpdateInventoryStock(
  updates: Array<{ itemId: string; adjustment: number; reason?: string }>
) {
  try {
    if (!updates || updates.length === 0) {
      return { success: false, error: "No updates provided" };
    }

    const results = await Promise.all(
      updates.map(async ({ itemId, adjustment, reason }) => {
        try {
          const item = await db.inventoryItem.findUnique({
            where: { id: itemId },
          });

          if (!item) {
            return { itemId, success: false, error: "Not found" };
          }

          const newStock = Math.max(0, Number(item.currentStock) + adjustment);

          await db.inventoryItem.update({
            where: { id: itemId },
            data: { currentStock: newStock },
          });

          // Create stock movement record for negative adjustments
          if (adjustment < 0) {
            await db.outboundStock.create({
              data: {
                itemId,
                branchId: item.branchId,
                movementType: "ADJUSTMENT_LOSS",
                quantity: Math.abs(adjustment),
                reason: reason || "Bulk stock adjustment",
              },
            });
          }

          return { itemId, success: true, newStock };
        } catch {
          return { itemId, success: false, error: "Update failed" };
        }
      })
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    await logUpdate("InventoryItem", "BULK_STOCK", {}, {
      action: "BULK_STOCK_UPDATE",
      total: updates.length,
      successful,
      failed,
    });

    revalidatePath("/dashboard/inventory");
    return { success: true, updated: successful, failed, details: results };
  } catch (error) {
    console.error("[bulkUpdateInventoryStock] Error:", error);
    return { success: false, error: "Failed to update stock" };
  }
}

export async function bulkUpdateInventoryCosts(
  branchIdOrItemIds: string | string[],
  adjustment: { type: "percentage" | "fixed"; value: number }
) {
  try {
    // Get items to update
    const where = Array.isArray(branchIdOrItemIds)
      ? { id: { in: branchIdOrItemIds }, deletedAt: null }
      : { branchId: branchIdOrItemIds, deletedAt: null };

    const items = await db.inventoryItem.findMany({
      where,
      select: { id: true, unitCost: true, name: true },
    });

    if (items.length === 0) {
      return { success: false, error: "No items found to update" };
    }

    // Calculate new costs
    const updates = items.map((item) => {
      let newCost = Number(item.unitCost);
      if (adjustment.type === "percentage") {
        newCost = newCost * (1 + adjustment.value / 100);
      } else {
        newCost = newCost + adjustment.value;
      }
      return {
        id: item.id,
        oldCost: Number(item.unitCost),
        newCost: Math.max(0, Math.round(newCost * 100) / 100),
      };
    });

    // Apply updates
    await Promise.all(
      updates.map(({ id, newCost }) =>
        db.inventoryItem.update({
          where: { id },
          data: { unitCost: newCost },
        })
      )
    );

    await logUpdate("InventoryItem", "BULK_COST", {}, {
      action: "BULK_COST_UPDATE",
      adjustment,
      count: updates.length,
    });

    revalidatePath("/dashboard/inventory");
    return {
      success: true,
      updated: updates.length,
      adjustments: updates.slice(0, 10),
    };
  } catch (error) {
    console.error("[bulkUpdateInventoryCosts] Error:", error);
    return { success: false, error: "Failed to update costs" };
  }
}

export async function bulkDeleteInventoryItems(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: "No items to delete" };
    }

    // Soft delete
    const result = await db.inventoryItem.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date(), isActive: false },
    });

    await logDelete("InventoryItem", "BULK", {
      action: "BULK_DELETE",
      count: result.count,
      ids,
    });

    revalidatePath("/dashboard/inventory");
    return { success: true, deleted: result.count };
  } catch (error) {
    console.error("[bulkDeleteInventoryItems] Error:", error);
    return { success: false, error: "Failed to delete inventory items" };
  }
}

// =====================================
// CATEGORY BULK OPERATIONS
// =====================================

export async function bulkCreateCategories(items: BulkCategoryInput[]) {
  try {
    if (!items || items.length === 0) {
      return { success: false, error: "No categories provided" };
    }

    // Filter out duplicates within the import
    const uniqueNames = new Set<string>();
    const uniqueItems = items.filter((item) => {
      const normalized = item.name.toLowerCase().trim();
      if (uniqueNames.has(normalized)) return false;
      uniqueNames.add(normalized);
      return true;
    });

    // Check for existing categories
    const existingCategories = await db.category.findMany({
      where: {
        name: { in: uniqueItems.map((i) => i.name.trim()), mode: "insensitive" },
        deletedAt: null,
      },
      select: { name: true },
    });

    const existingNames = new Set(existingCategories.map((c) => c.name.toLowerCase()));
    const newItems = uniqueItems.filter((i) => !existingNames.has(i.name.toLowerCase().trim()));

    if (newItems.length === 0) {
      return { success: false, error: "All categories already exist" };
    }

    const result = await db.category.createMany({
      data: newItems.map((item) => ({
        name: item.name.trim(),
        description: item.description?.trim(),
        isActive: true,
      })),
    });

    await logCreate("Category", "BULK", {
      action: "BULK_CREATE",
      count: result.count,
    });

    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/menu");
    return { success: true, created: result.count, skipped: items.length - result.count };
  } catch (error) {
    console.error("[bulkCreateCategories] Error:", error);
    return { success: false, error: "Failed to create categories" };
  }
}

// =====================================
// SUPPLIER BULK OPERATIONS
// =====================================

export async function bulkCreateSuppliers(items: BulkSupplierInput[]) {
  try {
    if (!items || items.length === 0) {
      return { success: false, error: "No suppliers provided" };
    }

    // Generate codes for items without one
    const itemsWithCodes = items.map((item, index) => ({
      ...item,
      code: item.code || `SUP-${Date.now().toString(36).toUpperCase()}${index.toString().padStart(3, "0")}`,
    }));

    // Check for duplicate codes
    const existingCodes = await db.supplier.findMany({
      where: {
        code: { in: itemsWithCodes.map((i) => i.code) },
        deletedAt: null,
      },
      select: { code: true },
    });

    const existingCodeSet = new Set(existingCodes.map((s) => s.code));
    const newItems = itemsWithCodes.filter((i) => !existingCodeSet.has(i.code));

    if (newItems.length === 0) {
      return { success: false, error: "All supplier codes already exist" };
    }

    const result = await db.supplier.createMany({
      data: newItems.map((item) => ({
        name: item.name.trim(),
        code: item.code,
        contactName: item.contactName?.trim(),
        email: item.email?.trim(),
        phone: item.phone?.trim(),
        address: item.address?.trim(),
        isActive: true,
      })),
    });

    await logCreate("Supplier", "BULK", {
      action: "BULK_CREATE",
      count: result.count,
    });

    revalidatePath("/dashboard/inventory");
    return { success: true, created: result.count, skipped: items.length - result.count };
  } catch (error) {
    console.error("[bulkCreateSuppliers] Error:", error);
    return { success: false, error: "Failed to create suppliers" };
  }
}

// =====================================
// STAFF BULK OPERATIONS
// =====================================

export async function bulkCreateStaff(items: BulkStaffInput[]) {
  try {
    if (!items || items.length === 0) {
      return { success: false, error: "No staff members provided" };
    }

    // Generate employee IDs for items without one
    const itemsWithIds = items.map((item, index) => ({
      ...item,
      employeeId: item.employeeId || `EMP-${Date.now().toString(36).toUpperCase()}${index.toString().padStart(3, "0")}`,
    }));

    // Check for duplicate employee IDs
    const existingIds = await db.staff.findMany({
      where: {
        employeeId: { in: itemsWithIds.map((i) => i.employeeId) },
        deletedAt: null,
      },
      select: { employeeId: true },
    });

    const existingIdSet = new Set(existingIds.map((s) => s.employeeId));
    const newItems = itemsWithIds.filter((i) => !existingIdSet.has(i.employeeId));

    if (newItems.length === 0) {
      return { success: false, error: "All employee IDs already exist" };
    }

    // Validate roles
    const validRoles = ["MANAGER", "KITCHEN", "SERVICE", "CASHIER", "DELIVERY"];
    const invalidRoles = newItems.filter((i) => !validRoles.includes(i.role.toUpperCase()));
    if (invalidRoles.length > 0) {
      return { 
        success: false, 
        error: `Invalid roles: ${invalidRoles.map((i) => i.role).join(", ")}. Valid roles: ${validRoles.join(", ")}` 
      };
    }

    const result = await db.staff.createMany({
      data: newItems.map((item) => ({
        employeeId: item.employeeId,
        firstName: item.firstName.trim(),
        lastName: item.lastName.trim(),
        email: item.email?.trim(),
        phone: item.phone?.trim(),
        role: item.role.toUpperCase() as "MANAGER" | "KITCHEN" | "SERVICE" | "CASHIER" | "DELIVERY",
        hourlyRate: item.hourlyRate,
        hireDate: new Date(),
        branchId: item.branchId,
        isActive: true,
        dutyStatus: "OFF_DUTY",
      })),
    });

    await logCreate("Staff", "BULK", {
      action: "BULK_CREATE",
      count: result.count,
    });

    revalidatePath("/dashboard/staff");
    return { success: true, created: result.count, skipped: items.length - result.count };
  } catch (error) {
    console.error("[bulkCreateStaff] Error:", error);
    return { success: false, error: "Failed to create staff members" };
  }
}
