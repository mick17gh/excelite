export interface RecipeLineForStock {
  ingredientItemId: string;
  quantity: number;
  ingredientName: string;
  ingredientSku: string;
  ingredientUnit: string;
  currentStock: number;
}

export interface RecipeForStock {
  outputQuantity: number;
  lines: RecipeLineForStock[];
}

export interface IngredientRequirement {
  ingredientItemId: string;
  name: string;
  sku: string;
  unit: string;
  needed: number;
  available: number;
  perOutputUnit: number;
}

function roundQty(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Ingredient use for a given number of output units (portions, etc.). */
export function computeIngredientRequirements(
  recipe: RecipeForStock,
  outputUnits: number,
): IngredientRequirement[] {
  const outputQty = recipe.outputQuantity > 0 ? recipe.outputQuantity : 1;
  const scale = outputUnits / outputQty;

  return recipe.lines.map((line) => {
    const perOutputUnit = line.quantity / outputQty;
    const needed = roundQty(line.quantity * scale);
    return {
      ingredientItemId: line.ingredientItemId,
      name: line.ingredientName,
      sku: line.ingredientSku,
      unit: line.ingredientUnit,
      needed,
      available: roundQty(line.currentStock),
      perOutputUnit: roundQty(perOutputUnit),
    };
  });
}

export function findStockShortages(
  recipe: RecipeForStock,
  outputUnits: number,
): IngredientRequirement[] {
  return computeIngredientRequirements(recipe, outputUnits).filter(
    (r) => r.available < r.needed,
  );
}

export function formatStockShortageError(
  shortages: IngredientRequirement[],
  outputUnits: number,
): string {
  if (shortages.length === 0) return "Insufficient stock";

  const lines = shortages.map(
    (s) =>
      `${s.name} (${s.sku}): need ${s.needed} ${s.unit}, have ${s.available} ${s.unit} ` +
      `(${s.perOutputUnit} ${s.unit} per output unit × ${outputUnits} units)`,
  );

  return `Insufficient stock for ${outputUnits} output unit(s). ${lines.join("; ")}`;
}
