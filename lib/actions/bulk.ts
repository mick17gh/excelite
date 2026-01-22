"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logCreate, logUpdate, logDelete } from "@/lib/services/audit";
import { InventoryCategory, UnitType } from "@/lib/generated/prisma/client";

// =====================================
// MENU BULK OPERATIONS
// =====================================

export interface BulkMenuItemInput {
  name: string;
  sku?: string;
  categoryId: string;
  price: number;
  cost?: number;
  description?: string;
  isActive?: boolean;
}

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
      data: itemsWithSkus,
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

export interface BulkInventoryItemInput {
  name: string;
  sku?: string;
  category: string;
  unit: string;
  unitCost: number;
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  branchId: string;
}

export async function bulkCreateInventoryItems(items: BulkInventoryItemInput[]) {
  try {
    if (!items || items.length === 0) {
      return { success: false, error: "No items provided" };
    }

    // Generate SKUs for items without one
    const itemsWithDefaults = items.map((item, index) => ({
      ...item,
      sku: item.sku || `INV-${Date.now().toString(36).toUpperCase()}${index.toString().padStart(3, "0")}`,
      category: item.category as InventoryCategory,
      unit: item.unit as UnitType,
      currentStock: item.currentStock ?? 0,
      minStock: item.minStock ?? 10,
      maxStock: item.maxStock ?? 100,
      reorderPoint: item.reorderPoint ?? 20,
      isActive: true,
    }));

    const result = await db.inventoryItem.createMany({
      data: itemsWithDefaults,
    });

    await logCreate("InventoryItem", "BULK", {
      action: "BULK_CREATE",
      count: result.count,
      branches: [...new Set(items.map((i) => i.branchId))],
    });

    revalidatePath("/dashboard/inventory");
    return { success: true, created: result.count };
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
// IMPORT/EXPORT UTILITIES
// =====================================

export interface ParsedCSVRow {
  [key: string]: string;
}

export function parseMenuCSV(rows: ParsedCSVRow[]): BulkMenuItemInput[] {
  return rows.map((row) => ({
    name: row.name || row.Name || "",
    sku: row.sku || row.SKU || undefined,
    categoryId: row.categoryId || row.CategoryId || row.category || row.Category || "",
    price: parseFloat(row.price || row.Price || "0"),
    cost: row.cost || row.Cost ? parseFloat(row.cost || row.Cost) : undefined,
    description: row.description || row.Description || undefined,
    isActive: row.isActive === "false" ? false : true,
  })).filter((item) => item.name && item.price > 0);
}

export function parseInventoryCSV(rows: ParsedCSVRow[], defaultBranchId: string): BulkInventoryItemInput[] {
  return rows.map((row) => ({
    name: row.name || row.Name || "",
    sku: row.sku || row.SKU || undefined,
    category: row.category || row.Category || "General",
    unit: row.unit || row.Unit || "unit",
    unitCost: parseFloat(row.unitCost || row["Unit Cost"] || row.cost || "0"),
    currentStock: row.currentStock || row["Current Stock"]
      ? parseFloat(row.currentStock || row["Current Stock"])
      : undefined,
    minStock: row.minStock || row["Min Stock"]
      ? parseFloat(row.minStock || row["Min Stock"])
      : undefined,
    maxStock: row.maxStock || row["Max Stock"]
      ? parseFloat(row.maxStock || row["Max Stock"])
      : undefined,
    reorderPoint: row.reorderPoint || row["Reorder Point"]
      ? parseFloat(row.reorderPoint || row["Reorder Point"])
      : undefined,
    branchId: row.branchId || row["Branch ID"] || defaultBranchId,
  })).filter((item) => item.name && item.branchId);
}

// Get template for CSV import
export function getMenuCSVTemplate(): string {
  const headers = ["name", "sku", "category", "price", "cost", "description", "isActive"];
  const example = ["Grilled Chicken", "GC-001", "Main Course", "25.99", "12.50", "Delicious grilled chicken breast", "true"];
  return [headers.join(","), example.join(",")].join("\n");
}

export function getInventoryCSVTemplate(): string {
  const headers = ["name", "sku", "category", "unit", "unitCost", "currentStock", "minStock", "maxStock", "reorderPoint"];
  const example = ["Chicken Breast", "CB-001", "Proteins", "kg", "8.50", "50", "10", "100", "20"];
  return [headers.join(","), example.join(",")].join("\n");
}
