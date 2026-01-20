"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface CreateMenuItemInput {
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface UpdateMenuItemInput {
  id: string;
  name?: string;
  sku?: string;
  category?: string;
  price?: number;
  cost?: number;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export async function createMenuItem(input: CreateMenuItemInput) {
  try {
    // Check if SKU already exists
    const existing = await db.menuItem.findUnique({
      where: { sku: input.sku },
    });

    if (existing) {
      return { success: false, error: "SKU already exists" };
    }

    const item = await db.menuItem.create({
      data: {
        name: input.name,
        sku: input.sku,
        category: input.category,
        price: input.price,
        cost: input.cost,
        description: input.description,
        imageUrl: input.imageUrl,
        isActive: input.isActive ?? true,
      },
    });

    revalidatePath("/dashboard/menu");
    revalidatePath("/pos");
    return { success: true, data: item };
  } catch (error) {
    console.error("[createMenuItem] Error:", error);
    return { success: false, error: "Failed to create menu item" };
  }
}

export async function updateMenuItem(input: UpdateMenuItemInput) {
  try {
    const { id, ...updateData } = input;

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

    const item = await db.menuItem.update({
      where: { id },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.sku && { sku: updateData.sku }),
        ...(updateData.category && { category: updateData.category }),
        ...(updateData.price !== undefined && { price: updateData.price }),
        ...(updateData.cost !== undefined && { cost: updateData.cost }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.imageUrl !== undefined && { imageUrl: updateData.imageUrl }),
        ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
      },
    });

    revalidatePath("/dashboard/menu");
    revalidatePath("/pos");
    return { success: true, data: item };
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

export async function getMenuItems(category?: string, includeInactive = false) {
  try {
    const items = await db.menuItem.findMany({
      where: {
        deletedAt: null,
        ...(category && { category }),
        ...(!includeInactive && { isActive: true }),
      },
      orderBy: [
        { category: "asc" },
        { name: "asc" },
      ],
    });

    // Convert Decimal fields to plain numbers for client components
    const convertedItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
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
    };
  } catch (error) {
    console.error("[getMenuItems] Error:", error);
    return { success: false, error: "Failed to fetch menu items", data: [] };
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
        cost: Number(item.cost),
      },
    };
  } catch (error) {
    console.error("[getMenuItemById] Error:", error);
    return { success: false, error: "Failed to fetch menu item" };
  }
}

export async function getMenuCategories() {
  try {
    const items = await db.menuItem.findMany({
      where: { deletedAt: null, isActive: true },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    return {
      success: true,
      data: items.map((item) => item.category),
    };
  } catch (error) {
    console.error("[getMenuCategories] Error:", error);
    return { success: false, error: "Failed to fetch categories", data: [] };
  }
}
