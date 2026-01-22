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
    const existing = await db.category.findFirst({
      where: {
        name: {
          equals: input.name,
          mode: "insensitive",
        },
        deletedAt: null,
      },
    });

    if (existing) {
      return { success: false, error: "Category already exists" };
    }

    // Create the category in the database
    const category = await db.category.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim(),
        isActive: true,
      },
    });

    revalidatePath("/dashboard/menu");
    revalidatePath("/dashboard/categories");
    return { 
      success: true, 
      data: { 
        id: category.id,
        name: category.name, 
        description: category.description,
        itemCount: 0 
      } 
    };
  } catch (error) {
    console.error("[createCategory] Error:", error);
    return { success: false, error: "Failed to create category" };
  }
}

export async function updateCategory(input: UpdateCategoryInput) {
  try {
    // Find the category to update
    const category = await db.category.findFirst({
      where: {
        id: input.id,
        deletedAt: null,
      },
    });
    
    if (!category) {
      return { success: false, error: "Category not found" };
    }

    // Check if new name already exists (if name is being changed)
    if (input.name && input.name !== category.name) {
      const existing = await db.category.findFirst({
        where: {
          name: {
            equals: input.name,
            mode: "insensitive",
          },
          deletedAt: null,
          id: { not: input.id },
        },
      });

      if (existing) {
        return { success: false, error: "Category name already exists" };
      }
    }

    // Update the category
    const updatedCategory = await db.category.update({
      where: { id: input.id },
      data: {
        ...(input.name && { name: input.name.trim() }),
        ...(input.description !== undefined && { description: input.description?.trim() }),
      },
    });

    revalidatePath("/dashboard/menu");
    revalidatePath("/dashboard/categories");
    return { success: true, data: { name: updatedCategory.name } };
  } catch (error) {
    console.error("[updateCategory] Error:", error);
    return { success: false, error: "Failed to update category" };
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    // Find the category first
    const category = await db.category.findFirst({
      where: {
        id: categoryId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            menuItems: {
              where: {
                deletedAt: null,
              }
            }
          }
        }
      }
    });

    if (!category) {
      return { success: false, error: "Category not found" };
    }

    if (category._count.menuItems > 0) {
      return {
        success: false,
        error: `Cannot delete category. ${category._count.menuItems} menu item(s) are using it.`,
      };
    }

    // Soft delete the category
    await db.category.update({
      where: { id: categoryId },
      data: { deletedAt: new Date() }
    });

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
    const categories = await db.category.findMany({
      where: { 
        deletedAt: null,
        isActive: true 
      },
      include: {
        _count: {
          select: {
            menuItems: {
              where: {
                deletedAt: null,
                isActive: true
              }
            }
          }
        }
      },
      orderBy: { name: "asc" },
    });

    const categoriesWithCounts = categories.map(category => ({
      id: category.id,
      name: category.name,
      itemCount: category._count.menuItems,
    }));

    return {
      success: true,
      data: categoriesWithCounts,
    };
  } catch (error) {
    console.error("[getCategories] Error:", error);
    return { success: false, error: "Failed to fetch categories", data: [] };
  }
}
