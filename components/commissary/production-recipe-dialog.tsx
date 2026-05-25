"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createProductionRecipe,
  updateProductionRecipe,
} from "@/lib/actions/production";
import {
  isRecipeIngredientItem,
  isRecipeOutputItem,
  type ProductionItemStage,
} from "@/lib/services/production-recipe-items";

export interface RecipeInventoryItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  itemStage: ProductionItemStage;
}

export interface RecipeForEdit {
  id: string;
  name: string;
  outputItemId: string;
  lines: Array<{
    ingredientItemId: string;
    quantity: number;
  }>;
}

interface ProductionRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  warehouseId: string;
  recipe: RecipeForEdit | null;
  inventory: RecipeInventoryItem[];
  onSaved: () => void;
}

type IngredientLine = {
  key: string;
  ingredientItemId: string;
  quantity: number;
};

function newIngredientLine(): IngredientLine {
  return {
    key: crypto.randomUUID(),
    ingredientItemId: "",
    quantity: 0.25,
  };
}

function inventoryComboboxOptions(items: RecipeInventoryItem[]) {
  return items.map((i) => ({
    value: i.id,
    label: `${i.name} (${i.sku})`,
    description: `${i.currentStock.toFixed(1)} ${i.unit} · ${i.itemStage.replace(/_/g, " ").toLowerCase()}`,
  }));
}

function linesFromRecipe(recipe: RecipeForEdit): IngredientLine[] {
  if (!recipe.lines.length) return [newIngredientLine()];
  return recipe.lines.map((line) => ({
    key: crypto.randomUUID(),
    ingredientItemId: line.ingredientItemId,
    quantity: line.quantity,
  }));
}

export function ProductionRecipeDialog({
  open,
  onOpenChange,
  mode,
  warehouseId,
  recipe,
  inventory,
  onSaved,
}: ProductionRecipeDialogProps) {
  const [name, setName] = useState("");
  const [outputItemId, setOutputItemId] = useState("");
  const [lines, setLines] = useState<IngredientLine[]>([newIngredientLine()]);
  const [saving, setSaving] = useState(false);

  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    if (isEdit && recipe) {
      setName(recipe.name);
      setOutputItemId(recipe.outputItemId);
      setLines(linesFromRecipe(recipe));
    } else if (!isEdit) {
      setName("");
      setOutputItemId("");
      setLines([newIngredientLine()]);
    }
  }, [open, isEdit, recipe]);

  const outputOptions = useMemo(
    () => inventoryComboboxOptions(inventory.filter(isRecipeOutputItem)),
    [inventory],
  );

  const ingredientOptionsForRow = (rowIngredientId: string) =>
    inventoryComboboxOptions(
      inventory.filter((i) => isRecipeIngredientItem(i, outputItemId || undefined)),
    ).filter((opt) => opt.value === rowIngredientId || !lines.some((l) => l.ingredientItemId === opt.value));

  useEffect(() => {
    if (!outputItemId) return;
    setLines((prev) =>
      prev.map((line) => {
        if (!line.ingredientItemId) return line;
        const item = inventory.find((i) => i.id === line.ingredientItemId);
        if (item && isRecipeIngredientItem(item, outputItemId)) return line;
        return { ...line, ingredientItemId: "" };
      }),
    );
  }, [outputItemId, inventory]);

  const addLine = () => setLines((prev) => [newIngredientLine(), ...prev]);

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  };

  const updateLine = (key: string, patch: Partial<Pick<IngredientLine, "ingredientItemId" | "quantity">>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const handleSave = async () => {
    if (!name.trim() || !outputItemId) {
      toast.error("Recipe name and output are required");
      return;
    }

    const filled = lines.filter((l) => l.ingredientItemId && l.quantity > 0);
    if (filled.length === 0) {
      toast.error("Add at least one ingredient with quantity greater than 0");
      return;
    }

    const ingredientIds = filled.map((l) => l.ingredientItemId);
    if (new Set(ingredientIds).size !== ingredientIds.length) {
      toast.error("Each ingredient can only appear once in the recipe");
      return;
    }

    if (isEdit && !recipe) return;

    setSaving(true);
    const payloadLines = filled.map(({ ingredientItemId, quantity }) => ({
      ingredientItemId,
      quantity,
    }));

    const res = isEdit
      ? await updateProductionRecipe({
          recipeId: recipe!.id,
          name: name.trim(),
          outputItemId,
          lines: payloadLines,
        })
      : await createProductionRecipe({
          warehouseId,
          name: name.trim(),
          outputItemId,
          lines: payloadLines,
        });
    setSaving(false);

    if (res.error) toast.error(res.error);
    else {
      toast.success(isEdit ? "Recipe updated" : "Recipe created");
      onOpenChange(false);
      onSaved();
    }
  };

  const hasIngredientCatalog = inventory.some((i) =>
    isRecipeIngredientItem(i, outputItemId || undefined),
  );

  const canSave = outputOptions.length > 0 && hasIngredientCatalog && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-w-[calc(100%-2rem)] max-h-[min(90vh,calc(100dvh-2rem))] flex flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>
            {isEdit ? "Edit production recipe" : "New production recipe"}
          </DialogTitle>
          <DialogDescription>
            Define branch-ready output and one or more raw/processed ingredients per 1
            output unit (e.g. chicken + oil + spice per portion).
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 grid gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Recipe name</Label>
            <Input
              placeholder="e.g. Portion marinated wings"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Output SKU (branch-ready)</Label>
            <Combobox
              options={outputOptions}
              value={outputItemId}
              onValueChange={setOutputItemId}
              placeholder="Select output item"
              searchPlaceholder="Search by name or SKU..."
              emptyText={
                inventory.length === 0
                  ? "Add commissary items first"
                  : "No branch-ready items — set item stage to Branch-ready"
              }
              disabled={outputOptions.length === 0}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Ingredients (per 1 output unit)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={addLine}
                disabled={!outputItemId}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add ingredient
              </Button>
            </div>
            {!isEdit && (
              <p className="text-[11px] text-muted-foreground">
                Example: 0.25 kg chicken + 0.02 L oil per 1 portion → scaled for batch size at
                run time.
              </p>
            )}
            <div className="space-y-2">
              {lines.map((line, index) => (
                <div
                  key={line.key}
                  className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_7rem_auto] gap-2 items-end rounded-lg border p-2.5 bg-muted/20"
                >
                  <div className="min-w-0 space-y-1">
                    <span className="text-[11px] text-muted-foreground">
                      Ingredient {index + 1}
                    </span>
                    <Combobox
                      options={ingredientOptionsForRow(line.ingredientItemId)}
                      value={line.ingredientItemId}
                      onValueChange={(v) => updateLine(line.key, { ingredientItemId: v })}
                      placeholder="Select bulk ingredient"
                      searchPlaceholder="Search by name or SKU..."
                      emptyText={
                        outputItemId
                          ? "No raw/processed items found"
                          : "Select output first"
                      }
                      disabled={!outputItemId}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      className="w-full"
                      min={0.001}
                      step="any"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.key, { quantity: Number(e.target.value) })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeLine(line.key)}
                    disabled={lines.length <= 1}
                    title={lines.length <= 1 ? "At least one ingredient required" : "Remove"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Save recipe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use ProductionRecipeDialog with mode="edit" */
export function EditProductionRecipeDialog(
  props: Omit<ProductionRecipeDialogProps, "mode" | "warehouseId"> & {
    warehouseId?: string;
  },
) {
  return (
    <ProductionRecipeDialog
      {...props}
      mode="edit"
      warehouseId={props.warehouseId ?? ""}
    />
  );
}
