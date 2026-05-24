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
import { Loader2 } from "lucide-react";
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

function inventoryComboboxOptions(items: RecipeInventoryItem[]) {
  return items.map((i) => ({
    value: i.id,
    label: `${i.name} (${i.sku})`,
    description: `${i.currentStock.toFixed(1)} ${i.unit} · ${i.itemStage.replace(/_/g, " ").toLowerCase()}`,
  }));
}

const EMPTY_FORM = {
  name: "",
  outputItemId: "",
  ingredientItemId: "",
  ingredientQty: 0.25,
};

export function ProductionRecipeDialog({
  open,
  onOpenChange,
  mode,
  warehouseId,
  recipe,
  inventory,
  onSaved,
}: ProductionRecipeDialogProps) {
  const [name, setName] = useState(EMPTY_FORM.name);
  const [outputItemId, setOutputItemId] = useState(EMPTY_FORM.outputItemId);
  const [ingredientItemId, setIngredientItemId] = useState(EMPTY_FORM.ingredientItemId);
  const [ingredientQty, setIngredientQty] = useState(EMPTY_FORM.ingredientQty);
  const [saving, setSaving] = useState(false);

  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    if (isEdit && recipe) {
      setName(recipe.name);
      setOutputItemId(recipe.outputItemId);
      const line = recipe.lines[0];
      if (line) {
        setIngredientItemId(line.ingredientItemId);
        setIngredientQty(line.quantity);
      }
    } else if (!isEdit) {
      setName(EMPTY_FORM.name);
      setOutputItemId(EMPTY_FORM.outputItemId);
      setIngredientItemId(EMPTY_FORM.ingredientItemId);
      setIngredientQty(EMPTY_FORM.ingredientQty);
    }
  }, [open, isEdit, recipe]);

  const outputOptions = useMemo(
    () => inventoryComboboxOptions(inventory.filter(isRecipeOutputItem)),
    [inventory],
  );

  const ingredientOptions = useMemo(
    () =>
      inventoryComboboxOptions(
        inventory.filter((i) => isRecipeIngredientItem(i, outputItemId)),
      ),
    [inventory, outputItemId],
  );

  useEffect(() => {
    if (
      ingredientItemId &&
      !inventory.some(
        (i) => isRecipeIngredientItem(i, outputItemId) && i.id === ingredientItemId,
      )
    ) {
      setIngredientItemId("");
    }
  }, [outputItemId, inventory, ingredientItemId]);

  const handleSave = async () => {
    if (!name.trim() || !outputItemId || !ingredientItemId) {
      toast.error("Recipe name, output, and ingredient required");
      return;
    }
    if (ingredientQty <= 0) {
      toast.error("Ingredient quantity must be greater than 0");
      return;
    }
    if (isEdit && !recipe) return;

    setSaving(true);
    const res = isEdit
      ? await updateProductionRecipe({
          recipeId: recipe!.id,
          name: name.trim(),
          outputItemId,
          lines: [{ ingredientItemId, quantity: ingredientQty }],
        })
      : await createProductionRecipe({
          warehouseId,
          name: name.trim(),
          outputItemId,
          lines: [{ ingredientItemId, quantity: ingredientQty }],
        });
    setSaving(false);

    if (res.error) toast.error(res.error);
    else {
      toast.success(isEdit ? "Recipe updated" : "Recipe created");
      onOpenChange(false);
      onSaved();
    }
  };

  const canSave =
    outputOptions.length > 0 &&
    ingredientOptions.length > 0 &&
    !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit production recipe" : "New production recipe"}
          </DialogTitle>
          <DialogDescription>
            Links a branch-ready output SKU to bulk ingredient usage (e.g. kg per
            portion). Output must be branch-ready; ingredients must be raw or
            processed bulk.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Recipe name</Label>
            <Input
              placeholder="e.g. Portion chicken"
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
          <div className="space-y-1.5">
            <Label className="text-xs">Ingredient per 1 output unit</Label>
            {!isEdit && (
              <p className="text-[11px] text-muted-foreground">
                Example: 0.25 KG per portion → 12.5 KG for a batch of 50.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_7rem] gap-3 items-end">
              <div className="min-w-0 space-y-1.5">
                <span className="text-[11px] text-muted-foreground sm:sr-only">
                  Ingredient SKU
                </span>
                <Combobox
                  options={ingredientOptions}
                  value={ingredientItemId}
                  onValueChange={setIngredientItemId}
                  placeholder="Select bulk ingredient"
                  searchPlaceholder="Search by name or SKU..."
                  emptyText="No raw/processed items found"
                  disabled={ingredientOptions.length === 0}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  className="w-full"
                  min={0.001}
                  step="any"
                  value={ingredientQty}
                  onChange={(e) => setIngredientQty(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
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
