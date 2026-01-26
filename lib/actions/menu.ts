"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { UnitType } from "@/lib/generated/prisma/client";

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
  ingredients?: IngredientInput[];
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
  ingredients?: IngredientInput[];
}

export interface IngredientInput {
  inventoryItemId: string;
  quantity: number;
  unit: UnitType;
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

    // Check if SKU already exists
    const existing = await db.menuItem.findUnique({
      where: { sku: input.sku },
    });

    if (existing) {
      return { success: false, error: "SKU already exists" };
    }

    // Calculate cost from ingredients if provided
    let calculatedCost = input.cost;
    if (input.ingredients && input.ingredients.length > 0) {
      const costResult = await calculateRecipeCost(input.ingredients);
      if (costResult.success && costResult.cost !== undefined) {
        calculatedCost = costResult.cost;
      }
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
        ...(input.ingredients && input.ingredients.length > 0 && {
          ingredients: {
            create: input.ingredients.map((ing) => ({
              inventoryItemId: ing.inventoryItemId,
              quantity: ing.quantity,
              unit: ing.unit,
            })),
          },
        }),
      },
      include: {
        category: true,
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
        cost: item.cost ? Number(item.cost) : null
      }
    };
  } catch (error) {
    console.error("[createMenuItem] Error:", error);
    return { success: false, error: "Failed to create menu item" };
  }
}

export async function updateMenuItem(input: UpdateMenuItemInput) {
  try {
    const { id, ingredients, ...updateData } = input;

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

      // Create new ingredients
      if (ingredients.length > 0) {
        await db.menuItemIngredient.createMany({
          data: ingredients.map((ing) => ({
            menuItemId: id,
            inventoryItemId: ing.inventoryItemId,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
        });
      }
    }

    const item = await db.menuItem.update({
      where: { id },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.sku && { sku: updateData.sku }),
        ...(updateData.categoryId && { categoryId: updateData.categoryId }),
        ...(updateData.price !== undefined && { price: updateData.price }),
        ...(calculatedCost !== undefined && { cost: calculatedCost }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.imageUrl !== undefined && { imageUrl: updateData.imageUrl }),
        ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
      },
    });

    revalidatePath("/dashboard/menu");
    revalidatePath("/pos");
    return { 
      success: true, 
      data: {
        ...item,
        price: Number(item.price),
        cost: item.cost ? Number(item.cost) : null
      }
    };
  } catch (error) {
    console.error("[updateMenuItem] Error:", error);
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
  pagination?: PaginationParams
): Promise<PaginatedResult<any>> {
  try {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where = {
      deletedAt: null,
      ...(categoryId && { categoryId }),
      ...(!includeInactive && { isActive: true }),
    };

    const [items, totalItems] = await Promise.all([
      db.menuItem.findMany({
        where,
        include: {
          category: true,
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

    // Convert Decimal fields to plain numbers for client components
    const convertedItems = items.map((item) => ({
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
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
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
      },
    });

    if (!item) {
      return { success: false, error: "Menu item not found" };
    }

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
        ingredients: item.ingredients.map((ing) => ({
          id: ing.id,
          inventoryItemId: ing.inventoryItemId,
          inventoryItemName: ing.inventoryItem.name,
          inventoryItemSku: ing.inventoryItem.sku,
          quantity: Number(ing.quantity),
          unit: ing.unit,
          unitCost: Number(ing.inventoryItem.unitCost),
          lineCost: Number(ing.quantity) * Number(ing.inventoryItem.unitCost),
        })),
      },
    };
  } catch (error) {
    console.error("[getMenuItemWithIngredients] Error:", error);
    return { success: false, error: "Failed to fetch menu item" };
  }
}

// Calculate recipe cost from ingredients
export async function calculateRecipeCost(ingredients: IngredientInput[]) {
  try {
    if (!ingredients || ingredients.length === 0) {
      return { success: true, cost: 0 };
    }

    const inventoryItemIds = ingredients.map((ing) => ing.inventoryItemId);
    const inventoryItems = await db.inventoryItem.findMany({
      where: { id: { in: inventoryItemIds } },
      select: { id: true, unitCost: true },
    });

    const costMap = new Map(
      inventoryItems.map((item) => [item.id, Number(item.unitCost)])
    );

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

// Get inventory items for ingredient selection
export async function getInventoryItemsForIngredients(branchId?: string) {
  try {
    const items = await db.inventoryItem.findMany({
      where: {
        isActive: true,
        ...(branchId && { branchId }),
      },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        unitCost: true,
        category: true,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Get unique items (dedupe by sku for cross-branch)
    const uniqueItems = new Map();
    for (const item of items) {
      if (!uniqueItems.has(item.sku)) {
        uniqueItems.set(item.sku, {
          id: item.id,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
          unitCost: Number(item.unitCost),
          category: item.category,
        });
      }
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
    await db.menuItemIngredient.create({
      data: {
        menuItemId,
        inventoryItemId: ingredient.inventoryItemId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
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
