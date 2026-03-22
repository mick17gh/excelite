/**
 * Inventory Category Constants
 * 
 * This file provides the InventoryCategory enum values and labels.
 * The values come from the Prisma schema enum.
 */

import { InventoryCategory } from "@/lib/generated/prisma/client";

// Get all inventory category values from the Prisma enum
export const INVENTORY_CATEGORIES = Object.values(InventoryCategory);

// Human-readable labels for each category
export const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  FOOD: "Food",
  BEVERAGE: "Beverage",
  PACKAGING: "Packaging",
  CLEANING: "Cleaning Supplies",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

// Helper function to get label for a category
export function getCategoryLabel(category: InventoryCategory): string {
  return CATEGORY_LABELS[category] || category;
}
