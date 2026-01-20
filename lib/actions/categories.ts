"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface CreateCategoryInput {
  name: string;
  description?: string;
}

export interface UpdateCategoryInput {
  id: string;
  name?: string;
  description?: string;
}

export async function createCategory(input: CreateCategoryInput) {
  try {
    // Check if category already exists (case-insensitive)
    const existing = await db.menuItem.findFirst({
      where: {
        category: {
          equals: input.name,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return { success: false, error: "Category already exists" };
    }

    // Categories are stored as strings in menu items
    // We'll create a menu item with this category to "register" it
    // Or we could create a separate Category model, but for now we'll just return success
    // The category will be created when the first menu item uses it

    revalidatePath("/dashboard/menu");
    revalidatePath("/dashboard/categories");
    return { success: true, data: { name: input.name, description: input.description } };
  } catch (error) {
    console.error("[createCategory] Error:", error);
    return { success: false, error: "Failed to create category" };
  }
}

export async function updateCategory(input: UpdateCategoryInput) {
  try {
    // Update all menu items with the old category name to the new one
    // First, get the old category name
    const categories = await getCategories();
    const oldCategory = categories.data?.find((c) => c.name === input.id);
    
    if (!oldCategory) {
      return { success: false, error: "Category not found" };
    }

    if (input.name && input.name !== oldCategory.name) {
      // Check if new name already exists
      const existing = await db.menuItem.findFirst({
        where: {
          category: {
            equals: input.name,
            mode: "insensitive",
          },
        },
      });

      if (existing) {
        return { success: false, error: "Category name already exists" };
      }

      // Update all menu items with this category
      await db.menuItem.updateMany({
        where: {
          category: oldCategory.name,
        },
        data: {
          category: input.name,
        },
      });
    }

    revalidatePath("/dashboard/menu");
    revalidatePath("/dashboard/categories");
    return { success: true, data: { name: input.name || oldCategory.name } };
  } catch (error) {
    console.error("[updateCategory] Error:", error);
    return { success: false, error: "Failed to update category" };
  }
}

export async function deleteCategory(categoryName: string) {
  try {
    // Check if any menu items use this category
    const itemsWithCategory = await db.menuItem.count({
      where: {
        category: categoryName,
        deletedAt: null,
      },
    });

    if (itemsWithCategory > 0) {
      return {
        success: false,
        error: `Cannot delete category. ${itemsWithCategory} menu item(s) are using it.`,
      };
    }

    revalidatePath("/dashboard/menu");
    revalidatePath("/dashboard/categories");
    return { success: true };
  } catch (error) {
    console.error("[deleteCategory] Error:", error);
    return { success: false, error: "Failed to delete category" };
  }
}

export async function getCategories() {
  try {
    const items = await db.menuItem.findMany({
      where: { deletedAt: null, isActive: true },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    // Count items per category
    const categoriesWithCounts = await Promise.all(
      items.map(async (item) => {
        const count = await db.menuItem.count({
          where: {
            category: item.category,
            deletedAt: null,
            isActive: true,
          },
        });
        return {
          name: item.category,
          itemCount: count,
        };
      })
    );

    return {
      success: true,
      data: categoriesWithCounts,
    };
  } catch (error) {
    console.error("[getCategories] Error:", error);
    return { success: false, error: "Failed to fetch categories", data: [] };
  }
}
