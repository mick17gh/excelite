"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { ProductionBatchStatus } from "@/lib/generated/prisma/client";
import {
  findStockShortages,
  formatStockShortageError,
  type RecipeForStock,
} from "@/lib/services/production-stock";

function dec(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && v !== null && "toNumber" in v) {
    return (v as { toNumber: () => number }).toNumber();
  }
  return Number(v);
}

function recipeForStockCheck(
  recipe: {
    outputQuantity: unknown;
    lines: Array<{
      ingredientItemId: string;
      quantity: unknown;
      ingredientItem: {
        name: string;
        sku: string;
        unit: string;
        currentStock: unknown;
      };
    }>;
  },
): RecipeForStock {
  return {
    outputQuantity: dec(recipe.outputQuantity),
    lines: recipe.lines.map((line) => ({
      ingredientItemId: line.ingredientItemId,
      quantity: dec(line.quantity),
      ingredientName: line.ingredientItem.name,
      ingredientSku: line.ingredientItem.sku,
      ingredientUnit: line.ingredientItem.unit,
      currentStock: dec(line.ingredientItem.currentStock),
    })),
  };
}

export interface ProductionRecipeLineInput {
  ingredientItemId: string;
  quantity: number;
}

async function validateRecipeItems(
  warehouseId: string,
  outputItemId: string,
  lines: ProductionRecipeLineInput[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (lines.length === 0) {
    return { ok: false, error: "At least one ingredient line is required" };
  }

  const ingredientIds = lines.map((l) => l.ingredientItemId);
  if (new Set(ingredientIds).size !== ingredientIds.length) {
    return { ok: false, error: "Each ingredient can only appear once in the recipe" };
  }

  const itemIds = [outputItemId, ...ingredientIds];
  const items = await db.warehouseInventoryItem.findMany({
    where: { id: { in: itemIds }, warehouseId },
    select: { id: true, name: true, sku: true, itemStage: true },
  });

  if (items.length !== itemIds.length) {
    return { ok: false, error: "Output or ingredient does not belong to this commissary" };
  }

  const output = items.find((i) => i.id === outputItemId);
  if (!output) return { ok: false, error: "Output item not found" };

  if (output.itemStage !== "BRANCH_READY") {
    return {
      ok: false,
      error:
        "Output must be a branch-ready item (item stage: Branch-ready). Use bulk/processed SKUs as ingredients only.",
    };
  }

  for (const line of lines) {
    if (line.quantity <= 0) {
      return { ok: false, error: "Ingredient quantities must be greater than 0" };
    }
    const ing = items.find((i) => i.id === line.ingredientItemId);
    if (!ing) continue;
    if (ing.itemStage === "BRANCH_READY") {
      return {
        ok: false,
        error: `${ing.name} (${ing.sku}) is branch-ready and cannot be used as an ingredient`,
      };
    }
    if (ing.id === outputItemId) {
      return { ok: false, error: "Output and ingredient cannot be the same item" };
    }
  }

  return { ok: true };
}

export async function createProductionRecipe(input: {
  warehouseId: string;
  name: string;
  outputItemId: string;
  outputQuantity?: number;
  lines: ProductionRecipeLineInput[];
}) {
  try {
    const warehouse = await db.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse || warehouse.warehouseType !== "COMMISSARY") {
      return { error: "Recipes must belong to a COMMISSARY warehouse" };
    }

    const itemCheck = await validateRecipeItems(
      input.warehouseId,
      input.outputItemId,
      input.lines,
    );
    if (!itemCheck.ok) return { error: itemCheck.error };

    const recipe = await db.productionRecipe.create({
      data: {
        warehouseId: input.warehouseId,
        name: input.name,
        outputItemId: input.outputItemId,
        outputQuantity: input.outputQuantity ?? 1,
        lines: {
          create: input.lines.map((l) => ({
            ingredientItemId: l.ingredientItemId,
            quantity: l.quantity,
          })),
        },
      },
      include: { lines: true, outputItem: true },
    });

    revalidatePath("/dashboard/warehouse");
    const full = await db.productionRecipe.findUnique({
      where: { id: recipe.id },
      include: {
        outputItem: { select: { id: true, name: true, sku: true, unit: true } },
        lines: {
          include: {
            ingredientItem: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
    });
    return { data: full ? serializeProductionRecipe(full) : undefined };
  } catch (error) {
    console.error("[createProductionRecipe]", error);
    return { error: "Failed to create recipe" };
  }
}

export async function updateProductionRecipe(input: {
  recipeId: string;
  name: string;
  outputItemId: string;
  outputQuantity?: number;
  lines: ProductionRecipeLineInput[];
}) {
  try {
    const existing = await db.productionRecipe.findUnique({
      where: { id: input.recipeId },
      include: { warehouse: true },
    });
    if (!existing || !existing.isActive) {
      return { error: "Recipe not found" };
    }
    if (existing.warehouse.warehouseType !== "COMMISSARY") {
      return { error: "Invalid recipe warehouse" };
    }

    const inProgress = await db.productionBatch.count({
      where: { recipeId: input.recipeId, status: "IN_PROGRESS" },
    });
    if (inProgress > 0) {
      return {
        error: "Cannot edit this recipe while a batch is in progress. Complete or cancel it first.",
      };
    }

    const itemCheck = await validateRecipeItems(
      existing.warehouseId,
      input.outputItemId,
      input.lines,
    );
    if (!itemCheck.ok) return { error: itemCheck.error };

    const recipe = await db.$transaction(async (tx) => {
      await tx.productionRecipeLine.deleteMany({ where: { recipeId: input.recipeId } });
      return tx.productionRecipe.update({
        where: { id: input.recipeId },
        data: {
          name: input.name.trim(),
          outputItemId: input.outputItemId,
          outputQuantity: input.outputQuantity ?? 1,
          lines: {
            create: input.lines.map((l) => ({
              ingredientItemId: l.ingredientItemId,
              quantity: l.quantity,
            })),
          },
        },
        include: {
          outputItem: { select: { id: true, name: true, sku: true, unit: true } },
          lines: {
            include: {
              ingredientItem: { select: { id: true, name: true, sku: true, unit: true } },
            },
          },
        },
      });
    });

    revalidatePath("/dashboard/warehouse");
    return { data: serializeProductionRecipe(recipe) };
  } catch (error) {
    console.error("[updateProductionRecipe]", error);
    return { error: "Failed to update recipe" };
  }
}

export async function deactivateProductionRecipe(recipeId: string) {
  try {
    const inProgress = await db.productionBatch.count({
      where: { recipeId, status: "IN_PROGRESS" },
    });
    if (inProgress > 0) {
      return {
        error: "Cannot remove recipe while a batch is in progress",
      };
    }

    await db.productionRecipe.update({
      where: { id: recipeId },
      data: { isActive: false },
    });
    revalidatePath("/dashboard/warehouse");
    return { success: true };
  } catch (error) {
    console.error("[deactivateProductionRecipe]", error);
    return { error: "Failed to remove recipe" };
  }
}

type RecipeWithRelations = Awaited<
  ReturnType<
    typeof db.productionRecipe.findMany<{
      include: {
        outputItem: { select: { id: true; name: true; sku: true; unit: true } };
        lines: {
          include: {
            ingredientItem: { select: { id: true; name: true; sku: true; unit: true } };
          };
        };
      };
    }>
  >
>[number];

function serializeProductionBatch(batch: {
  id: string;
  recipeId: string;
  warehouseId: string;
  status: ProductionBatchStatus;
  plannedOutput: unknown;
  actualOutput: unknown | null;
  wasteQuantity: unknown;
  producedBy: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: batch.id,
    recipeId: batch.recipeId,
    warehouseId: batch.warehouseId,
    status: batch.status,
    plannedOutput: dec(batch.plannedOutput),
    actualOutput: batch.actualOutput != null ? dec(batch.actualOutput) : null,
    wasteQuantity: dec(batch.wasteQuantity),
    producedBy: batch.producedBy,
    startedAt: batch.startedAt?.toISOString() ?? null,
    completedAt: batch.completedAt?.toISOString() ?? null,
    notes: batch.notes,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

function serializeProductionRecipe(recipe: RecipeWithRelations) {
  return {
    id: recipe.id,
    warehouseId: recipe.warehouseId,
    name: recipe.name,
    outputItemId: recipe.outputItemId,
    outputQuantity: dec(recipe.outputQuantity),
    isActive: recipe.isActive,
    createdAt: recipe.createdAt.toISOString(),
    updatedAt: recipe.updatedAt.toISOString(),
    outputItem: recipe.outputItem,
    lines: recipe.lines.map((line) => ({
      id: line.id,
      recipeId: line.recipeId,
      ingredientItemId: line.ingredientItemId,
      quantity: dec(line.quantity),
      ingredientItem: line.ingredientItem,
    })),
  };
}

export async function getProductionRecipes(warehouseId: string) {
  try {
    const recipes = await db.productionRecipe.findMany({
      where: { warehouseId, isActive: true },
      include: {
        outputItem: { select: { id: true, name: true, sku: true, unit: true } },
        lines: {
          include: {
            ingredientItem: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return { data: recipes.map(serializeProductionRecipe) };
  } catch (error) {
    return { data: [] };
  }
}

export async function startProductionBatch(input: {
  recipeId: string;
  plannedOutput: number;
  producedBy?: string;
  notes?: string;
}) {
  try {
    const recipe = await db.productionRecipe.findUnique({
      where: { id: input.recipeId },
      include: {
        lines: { include: { ingredientItem: true } },
      },
    });
    if (!recipe) return { error: "Recipe not found" };

    if (input.plannedOutput <= 0) {
      return { error: "Planned output must be greater than 0" };
    }

    const shortages = findStockShortages(
      recipeForStockCheck(recipe),
      input.plannedOutput,
    );
    if (shortages.length > 0) {
      return {
        error: formatStockShortageError(shortages, input.plannedOutput),
      };
    }

    const batch = await db.productionBatch.create({
      data: {
        recipeId: recipe.id,
        warehouseId: recipe.warehouseId,
        status: "IN_PROGRESS",
        plannedOutput: input.plannedOutput,
        producedBy: input.producedBy || null,
        notes: input.notes || null,
        startedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/warehouse");
    return { data: serializeProductionBatch(batch) };
  } catch (error) {
    console.error("[startProductionBatch]", error);
    return { error: "Failed to start batch" };
  }
}

export async function completeProductionBatch(input: {
  batchId: string;
  actualOutput: number;
  wasteQuantity?: number;
}) {
  try {
    const batch = await db.productionBatch.findUnique({
      where: { id: input.batchId },
      include: {
        recipe: {
          include: {
            lines: { include: { ingredientItem: true } },
            outputItem: true,
          },
        },
      },
    });

    if (!batch || batch.status !== "IN_PROGRESS") {
      return { error: "Batch not found or not in progress" };
    }

    const recipe = batch.recipe;

    if (input.actualOutput < 0) {
      return { error: "Actual output cannot be negative" };
    }

    const shortages = findStockShortages(
      recipeForStockCheck(recipe),
      input.actualOutput,
    );
    if (shortages.length > 0) {
      return {
        error: formatStockShortageError(shortages, input.actualOutput),
      };
    }

    const scale = input.actualOutput / dec(recipe.outputQuantity);

    for (const line of recipe.lines) {
      const consumeQty = dec(line.quantity) * scale;
      await db.warehouseInventoryItem.update({
        where: { id: line.ingredientItemId },
        data: { currentStock: { decrement: consumeQty } },
      });
      await db.productionBatchConsumption.create({
        data: {
          batchId: batch.id,
          ingredientItemId: line.ingredientItemId,
          quantity: consumeQty,
        },
      });
    }

    const outputItem = recipe.outputItem;
    await db.warehouseInventoryItem.update({
      where: { id: outputItem.id },
      data: { currentStock: { increment: input.actualOutput } },
    });

    const updated = await db.productionBatch.update({
      where: { id: batch.id },
      data: {
        status: "COMPLETED",
        actualOutput: input.actualOutput,
        wasteQuantity: input.wasteQuantity ?? 0,
        completedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/warehouse");
    return { data: serializeProductionBatch(updated) };
  } catch (error) {
    console.error("[completeProductionBatch]", error);
    return { error: "Failed to complete batch" };
  }
}

export async function getProductionBatches(warehouseId: string, limit = 50) {
  try {
    const batches = await db.productionBatch.findMany({
      where: { warehouseId },
      include: {
        recipe: {
          select: {
            name: true,
            outputItem: { select: { name: true, sku: true, unit: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return {
      data: batches.map((b) => ({
        id: b.id,
        recipeId: b.recipeId,
        recipeName: b.recipe.name,
        outputName: b.recipe.outputItem.name,
        outputUnit: b.recipe.outputItem.unit,
        status: b.status,
        plannedOutput: dec(b.plannedOutput),
        actualOutput: b.actualOutput != null ? dec(b.actualOutput) : null,
        startedAt: b.startedAt?.toISOString() || null,
        completedAt: b.completedAt?.toISOString() || null,
        createdAt: b.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return { data: [] };
  }
}

export async function cancelProductionBatch(batchId: string) {
  try {
    await db.productionBatch.update({
      where: { id: batchId },
      data: { status: "CANCELLED" },
    });
    revalidatePath("/dashboard/warehouse");
    return { success: true };
  } catch (error) {
    return { error: "Failed to cancel batch" };
  }
}
