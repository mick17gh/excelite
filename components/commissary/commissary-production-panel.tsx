"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getProductionRecipes,
  deactivateProductionRecipe,
  startProductionBatch,
  completeProductionBatch,
  cancelProductionBatch,
  getProductionBatches,
} from "@/lib/actions/production";
import { getWarehouseInventory } from "@/lib/actions/warehouse";
import {
  computeIngredientRequirements,
  findStockShortages,
  type RecipeForStock,
} from "@/lib/services/production-stock";
import type { ProductionItemStage } from "@/lib/services/production-recipe-items";
import {
  ProductionRecipeDialog,
  type RecipeForEdit,
} from "@/components/commissary/production-recipe-dialog";
interface CommissaryProductionPanelProps {
  commissaryWarehouseId: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  itemStage: ProductionItemStage;
}

interface RecipeOption {
  id: string;
  name: string;
  outputItemId: string;
  outputQuantity: number;
  outputItem: { name: string; sku: string; unit: string };
  lines: Array<{
    ingredientItemId: string;
    quantity: number;
    ingredientItem: { name: string; sku: string; unit: string };
  }>;
}

interface BatchRow {
  id: string;
  recipeId: string;
  recipeName: string;
  outputName: string;
  outputUnit: string;
  status: string;
  plannedOutput: number;
  actualOutput: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

function buildRecipeForStock(
  recipe: RecipeOption | undefined,
  inventory: InventoryItem[],
): RecipeForStock | null {
  if (!recipe) return null;
  const stockById = new Map(inventory.map((i) => [i.id, i.currentStock]));
  return {
    outputQuantity: recipe.outputQuantity,
    lines: recipe.lines.map((line) => ({
      ingredientItemId: line.ingredientItemId,
      quantity: line.quantity,
      ingredientName: line.ingredientItem.name,
      ingredientSku: line.ingredientItem.sku,
      ingredientUnit: line.ingredientItem.unit,
      currentStock: stockById.get(line.ingredientItemId) ?? 0,
    })),
  };
}

function StockRequirementPreview({
  requirements,
  outputUnits,
  outputUnit,
}: {
  requirements: ReturnType<typeof computeIngredientRequirements>;
  outputUnits: number;
  outputUnit: string;
}) {
  if (requirements.length === 0) return null;

  const shortages = requirements.filter((r) => r.available < r.needed);

  return (
    <div
      className={`rounded-lg border p-3 text-xs space-y-2 ${
        shortages.length > 0
          ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
          : "border-border bg-muted/30"
      }`}
    >
      <p className="font-medium text-foreground">
        Ingredients for {outputUnits} {outputUnit}
      </p>
      <ul className="space-y-1">
        {requirements.map((r) => {
          const short = r.available < r.needed;
          return (
            <li
              key={r.ingredientItemId}
              className={short ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}
            >
              {r.name} ({r.sku}): need <strong>{r.needed}</strong> {r.unit}, have{" "}
              {r.available} {r.unit}
              <span className="block text-[11px] opacity-80">
                {r.perOutputUnit} {r.unit} per output unit
              </span>
            </li>
          );
        })}
      </ul>
      {shortages.length > 0 && (
        <p className="text-red-700 dark:text-red-400 font-medium">
          Not enough stock — reduce output quantity, add stock, or lower the per-unit amount on the
          recipe.
        </p>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  IN_PROGRESS:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  COMPLETED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCELLED: "bg-muted text-muted-foreground",
  DRAFT: "bg-muted text-muted-foreground",
};

export function CommissaryProductionPanel({
  commissaryWarehouseId,
}: CommissaryProductionPanelProps) {
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [recipeId, setRecipeId] = useState("");
  const [plannedOutput, setPlannedOutput] = useState(1);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [actualOutput, setActualOutput] = useState(1);

  const [loading, setLoading] = useState(true);
  const [startingBatch, setStartingBatch] = useState(false);
  const [completingBatch, setCompletingBatch] = useState(false);
  const [cancellingBatch, setCancellingBatch] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeForEdit | null>(null);
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [recipeDialogMode, setRecipeDialogMode] = useState<"create" | "edit">("create");
  const [deactivatingRecipeId, setDeactivatingRecipeId] = useState<string | null>(null);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [r, b, inv] = await Promise.all([
      getProductionRecipes(commissaryWarehouseId),
      getProductionBatches(commissaryWarehouseId),
      getWarehouseInventory(commissaryWarehouseId),
    ]);

    setInventory(
      (inv.data || []).map((i) => ({
        id: i.id,
        name: i.name,
        sku: i.sku,
        unit: i.unit,
        currentStock: i.currentStock,
        itemStage: i.itemStage as ProductionItemStage,
      })),
    );

    setRecipes(
      (r.data || []).map((x) => ({
        id: x.id,
        name: x.name,
        outputItemId: x.outputItemId,
        outputQuantity: Number(x.outputQuantity),
        outputItem: {
          name: x.outputItem.name,
          sku: x.outputItem.sku,
          unit: x.outputItem.unit,
        },
        lines: (x.lines || []).map((line) => ({
          ingredientItemId: line.ingredientItemId,
          quantity: Number(line.quantity),
          ingredientItem: {
            name: line.ingredientItem.name,
            sku: line.ingredientItem.sku,
            unit: line.ingredientItem.unit,
          },
        })),
      })),
    );

    setBatches(b.data || []);
    setLoading(false);
  }, [commissaryWarehouseId]);

  useEffect(() => {
    load();
  }, [load]);

  const inProgressBatches = useMemo(
    () => batches.filter((b) => b.status === "IN_PROGRESS"),
    [batches],
  );

  const selectedBatch = useMemo(
    () => batches.find((b) => b.id === selectedBatchId),
    [batches, selectedBatchId],
  );

  // Keep completion UI in sync with in-progress batches (e.g. after refresh)
  useEffect(() => {
    if (inProgressBatches.length === 0) {
      setSelectedBatchId("");
      return;
    }
    const stillValid = inProgressBatches.some((b) => b.id === selectedBatchId);
    if (!stillValid) {
      const next = inProgressBatches[0];
      setSelectedBatchId(next.id);
      setActualOutput(next.plannedOutput);
    }
  }, [inProgressBatches, selectedBatchId]);

  const recipeOptions = useMemo(
    () =>
      recipes.map((r) => ({
        value: r.id,
        label: r.name,
        description: `→ ${r.outputItem.name} (${r.outputItem.sku}) · ${r.outputItem.unit}`,
      })),
    [recipes],
  );

  const batchSelectOptions = useMemo(
    () =>
      inProgressBatches.map((b) => ({
        value: b.id,
        label: `${b.recipeName} — ${b.outputName}`,
        description: `Planned: ${b.plannedOutput} · started ${b.startedAt ? new Date(b.startedAt).toLocaleString() : "—"}`,
      })),
    [inProgressBatches],
  );

  const selectedRecipe = useMemo(
    () => recipes.find((r) => r.id === recipeId),
    [recipes, recipeId],
  );

  const batchRecipe = useMemo(
    () =>
      selectedBatch
        ? recipes.find((r) => r.id === selectedBatch.recipeId)
        : undefined,
    [recipes, selectedBatch],
  );

  const startRequirements = useMemo(() => {
    const stock = buildRecipeForStock(selectedRecipe, inventory);
    if (!stock || plannedOutput <= 0) return [];
    return computeIngredientRequirements(stock, plannedOutput);
  }, [selectedRecipe, inventory, plannedOutput]);

  const completeRequirements = useMemo(() => {
    const stock = buildRecipeForStock(batchRecipe, inventory);
    if (!stock || actualOutput < 0) return [];
    return computeIngredientRequirements(stock, actualOutput);
  }, [batchRecipe, inventory, actualOutput]);

  const completeHasShortage = useMemo(() => {
    const stock = buildRecipeForStock(batchRecipe, inventory);
    if (!stock) return false;
    return findStockShortages(stock, actualOutput).length > 0;
  }, [batchRecipe, inventory, actualOutput]);

  const startHasShortage = startRequirements.some((r) => r.available < r.needed);

  const filteredRecipes = useMemo(() => {
    const q = recipeSearchQuery.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => {
      const line = r.lines[0];
      const haystack = [
        r.name,
        r.outputItem.name,
        r.outputItem.sku,
        line?.ingredientItem.name,
        line?.ingredientItem.sku,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [recipes, recipeSearchQuery]);

  const handleStart = async () => {
    if (!recipeId) return toast.error("Select a recipe");
    if (plannedOutput <= 0) return toast.error("Planned output must be greater than 0");
    setStartingBatch(true);
    const res = await startProductionBatch({ recipeId, plannedOutput });
    setStartingBatch(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Batch started — enter actual output below to complete");
      const newId = res.data?.id || "";
      setSelectedBatchId(newId);
      setActualOutput(plannedOutput);
      await load();
    }
  };

  const handleComplete = async () => {
    if (!selectedBatchId) return toast.error("Select an active batch");
    if (actualOutput < 0) return toast.error("Actual output cannot be negative");
    setCompletingBatch(true);
    const res = await completeProductionBatch({
      batchId: selectedBatchId,
      actualOutput,
    });
    setCompletingBatch(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Batch completed — stock updated");
      setSelectedBatchId("");
      await load();
    }
  };

  const handleCancel = async (batchId: string) => {
    setCancellingBatch(true);
    const res = await cancelProductionBatch(batchId);
    setCancellingBatch(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Batch cancelled");
      if (selectedBatchId === batchId) setSelectedBatchId("");
      await load();
    }
  };

  const handleSelectBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    const batch = batches.find((b) => b.id === batchId);
    if (batch) setActualOutput(batch.plannedOutput);
  };

  const openCreateRecipe = () => {
    setEditingRecipe(null);
    setRecipeDialogMode("create");
    setRecipeDialogOpen(true);
  };

  const openEditRecipe = (recipe: RecipeOption) => {
    setEditingRecipe({
      id: recipe.id,
      name: recipe.name,
      outputItemId: recipe.outputItemId,
      lines: recipe.lines.map((l) => ({
        ingredientItemId: l.ingredientItemId,
        quantity: l.quantity,
      })),
    });
    setRecipeDialogMode("edit");
    setRecipeDialogOpen(true);
  };

  const handleDeactivateRecipe = async (recipeId: string) => {
    setDeactivatingRecipeId(recipeId);
    const res = await deactivateProductionRecipe(recipeId);
    setDeactivatingRecipeId(null);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Recipe removed");
      setRecipeId((current) => (current === recipeId ? "" : current));
      await load();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active batch — prominent so completion is obvious */}
      {inProgressBatches.length > 0 && (
        <Card
          id="complete-active-batch"
          className="chart-card rounded-xl border-amber-200/80 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20"
        >
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              Complete active batch
              <Badge className={STATUS_STYLES.IN_PROGRESS}>In progress</Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              After starting a batch, record actual yield here. Ingredient stock is deducted and
              output stock is added when you complete.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {inProgressBatches.length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Active batch</Label>
                <Combobox
                  options={batchSelectOptions}
                  value={selectedBatchId}
                  onValueChange={handleSelectBatch}
                  placeholder="Select batch to complete"
                  searchPlaceholder="Search batches..."
                  emptyText="No active batches"
                />
              </div>
            )}
            {selectedBatch && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedBatch.recipeName}</span>
                {" · "}
                planned {selectedBatch.plannedOutput} {selectedBatch.outputName}
              </p>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Actual output qty</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={actualOutput}
                onChange={(e) => setActualOutput(Number(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground">
                Stock is checked against this amount (not just planned). Lower it if you had waste, or
                add ingredient stock first.
              </p>
            </div>
            {batchRecipe && completeRequirements.length > 0 && (
              <StockRequirementPreview
                requirements={completeRequirements}
                outputUnits={actualOutput}
                outputUnit={selectedBatch?.outputUnit || batchRecipe.outputItem.unit}
              />
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={completingBatch || !selectedBatchId || completeHasShortage}
              >
                {completingBatch && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete batch
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => selectedBatchId && handleCancel(selectedBatchId)}
                disabled={cancellingBatch || !selectedBatchId}
              >
                {cancellingBatch && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancel batch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Run production batch</CardTitle>
          <CardDescription className="text-xs">
            Start a new batch. Completion fields appear in the highlighted card above once started.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Recipe</Label>
            <Combobox
              options={recipeOptions}
              value={recipeId}
              onValueChange={setRecipeId}
              placeholder="Select recipe"
              searchPlaceholder="Search recipes..."
              emptyText={
                recipes.length === 0 ? "Add a recipe first" : "No recipes found"
              }
              disabled={recipes.length === 0}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Planned output qty</Label>
            <Input
              type="number"
              min={0.001}
              step="any"
              value={plannedOutput}
              onChange={(e) => setPlannedOutput(Number(e.target.value))}
            />
          </div>
          {selectedRecipe && startRequirements.length > 0 && (
            <StockRequirementPreview
              requirements={startRequirements}
              outputUnits={plannedOutput}
              outputUnit={selectedRecipe.outputItem.unit}
            />
          )}
          <Button
            size="sm"
            onClick={handleStart}
            disabled={startingBatch || !recipeId || startHasShortage}
          >
            {startingBatch && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start batch
          </Button>
        </CardContent>
      </Card>

      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Production recipes</CardTitle>
            <CardDescription className="text-xs">
              Output = branch-ready SKUs (portions). Ingredients = raw or processed bulk only.
            </CardDescription>
          </div>
          <Button size="sm" className="shrink-0" onClick={openCreateRecipe}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Recipe
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {recipes.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search recipes by name, SKU, or ingredient..."
                value={recipeSearchQuery}
                onChange={(e) => setRecipeSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {recipes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recipes yet — click <strong>Add New Recipe</strong> to create one.
            </p>
          ) : filteredRecipes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recipes match your search.</p>
          ) : (
            <ul className="space-y-2">
              {filteredRecipes.map((r) => {
                const line = r.lines[0];
                return (
                  <li
                    key={r.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border rounded-lg p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {line
                          ? `${line.ingredientItem.name} (${line.ingredientItem.sku}): ${line.quantity} ${line.ingredientItem.unit} per ${r.outputItem.unit} → ${r.outputItem.name} (${r.outputItem.sku})`
                          : "No ingredients"}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditRecipe(r)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeactivateRecipe(r.id)}
                        disabled={deactivatingRecipeId === r.id}
                      >
                        {deactivatingRecipeId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <ProductionRecipeDialog
        open={recipeDialogOpen}
        onOpenChange={setRecipeDialogOpen}
        mode={recipeDialogMode}
        warehouseId={commissaryWarehouseId}
        recipe={editingRecipe}
        inventory={inventory}
        onSaved={load}
      />

      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Batch history</CardTitle>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => load()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No batches yet</p>
          ) : (
            <ul className="space-y-2">
              {batches.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border rounded-lg p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {b.recipeName}
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        · {b.outputName}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Planned {b.plannedOutput}
                      {b.actualOutput != null ? ` → actual ${b.actualOutput}` : ""}
                      {b.completedAt
                        ? ` · ${new Date(b.completedAt).toLocaleString()}`
                        : b.startedAt
                          ? ` · started ${new Date(b.startedAt).toLocaleString()}`
                          : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={STATUS_STYLES[b.status] || STATUS_STYLES.DRAFT}>
                      {b.status.replace(/_/g, " ")}
                    </Badge>
                    {b.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          handleSelectBatch(b.id);
                          document
                            .getElementById("complete-active-batch")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
