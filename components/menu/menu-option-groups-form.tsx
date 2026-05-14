"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Plus, Trash2, ChevronDown, Layers } from "lucide-react";
import type { MenuItemOptionGroupInput } from "@/lib/actions/menu";
import { MAX_OPTION_GROUPS_PER_MENU_ITEM } from "@/lib/menu-selections";
import { UnitType } from "@/lib/generated/prisma/client";
import { UNIT_TYPES, UNIT_LABELS } from "@/lib/constants/units";

const unitOptions: { value: UnitType; label: string }[] = UNIT_TYPES.map((unit) => ({
  value: unit,
  label: UNIT_LABELS[unit],
}));

function newKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `k-${Math.random().toString(36).slice(2)}`;
}

export type OptionIngredientRow = {
  inventoryItemId: string;
  inventoryItemName?: string;
  quantity: number;
  unit: UnitType;
  unitCost?: number;
};

export type LocalMenuOptionRow = {
  _key: string;
  name: string;
  sortOrder: number;
  priceDelta: string;
  costDelta: string;
  sku: string;
  isDefault: boolean;
  isActive: boolean;
  ingredients: OptionIngredientRow[];
};

export type LocalMenuOptionGroupRow = {
  _key: string;
  name: string;
  sortOrder: number;
  isRequired: boolean;
  minSelections: string;
  maxSelections: string;
  isActive: boolean;
  options: LocalMenuOptionRow[];
};

type InventoryItemOption = {
  id: string;
  name: string;
  sku: string;
  unit: UnitType;
  unitCost: number;
  category: string;
};

export function emptyLocalOptionGroup(): LocalMenuOptionGroupRow {
  return {
    _key: newKey(),
    name: "",
    sortOrder: 0,
    isRequired: true,
    minSelections: "1",
    maxSelections: "1",
    isActive: true,
    options: [
      {
        _key: newKey(),
        name: "",
        sortOrder: 0,
        priceDelta: "0",
        costDelta: "",
        sku: "",
        isDefault: true,
        isActive: true,
        ingredients: [],
      },
    ],
  };
}

export function localFromServerOptionGroups(
  groups: {
    id: string;
    name: string;
    sortOrder: number;
    isRequired: boolean;
    minSelections: number;
    maxSelections: number;
    isActive: boolean;
    options: {
      id: string;
      name: string;
      sortOrder: number;
      priceDelta: number;
      costDelta: number | null;
      sku: string | null;
      isDefault: boolean;
      isActive: boolean;
      ingredients: {
        inventoryItemId: string;
        inventoryItemName?: string;
        quantity: number;
        unit: UnitType;
        unitCost?: number;
      }[];
    }[];
  }[]
): LocalMenuOptionGroupRow[] {
  return groups.map((g) => ({
    _key: g.id,
    name: g.name,
    sortOrder: g.sortOrder,
    isRequired: g.isRequired,
    minSelections: String(g.minSelections),
    maxSelections: String(g.maxSelections),
    isActive: g.isActive,
    options: g.options.map((o) => ({
      _key: o.id,
      name: o.name,
      sortOrder: o.sortOrder,
      priceDelta: String(o.priceDelta),
      costDelta: o.costDelta != null ? String(o.costDelta) : "",
      sku: o.sku || "",
      isDefault: o.isDefault,
      isActive: o.isActive,
      ingredients: o.ingredients.map((ing) => ({
        inventoryItemId: ing.inventoryItemId,
        inventoryItemName: ing.inventoryItemName,
        quantity: ing.quantity,
        unit: ing.unit,
        unitCost: ing.unitCost,
      })),
    })),
  }));
}

export function serializeLocalOptionGroups(
  groups: LocalMenuOptionGroupRow[]
): MenuItemOptionGroupInput[] | undefined {
  if (!groups.length) return undefined;
  return groups.map((g, gi) => ({
    name: g.name.trim(),
    sortOrder: Number.isFinite(g.sortOrder) ? g.sortOrder : gi,
    isRequired: g.isRequired,
    minSelections: Math.max(0, parseInt(g.minSelections || "0", 10) || 0),
    maxSelections: Math.max(1, parseInt(g.maxSelections || "1", 10) || 1),
    isActive: g.isActive,
    options: g.options.map((o, oi) => {
      const ings = o.ingredients
        .filter((ing) => ing.inventoryItemId && ing.quantity > 0)
        .map((ing) => ({
          inventoryItemId: ing.inventoryItemId,
          quantity: ing.quantity,
          unit: ing.unit,
        }));
      return {
        name: o.name.trim(),
        sortOrder: Number.isFinite(o.sortOrder) ? o.sortOrder : oi,
        priceDelta: parseFloat(o.priceDelta) || 0,
        costDelta: o.costDelta.trim() === "" ? null : parseFloat(o.costDelta),
        sku: o.sku.trim() || null,
        isDefault: o.isDefault,
        isActive: o.isActive,
        ...(ings.length ? { ingredients: ings } : {}),
      };
    }),
  }));
}

interface MenuOptionGroupsFormProps {
  groups: LocalMenuOptionGroupRow[];
  onChange: (next: LocalMenuOptionGroupRow[]) => void;
  inventoryItems: InventoryItemOption[];
  onEnsureInventory: () => void;
}

export function MenuOptionGroupsForm({
  groups,
  onChange,
  inventoryItems,
  onEnsureInventory,
}: MenuOptionGroupsFormProps) {
  const addGroup = () => {
    if (groups.length >= MAX_OPTION_GROUPS_PER_MENU_ITEM) return;
    onChange([...groups, emptyLocalOptionGroup()]);
  };

  const removeGroup = (idx: number) => {
    onChange(groups.filter((_, i) => i !== idx));
  };

  const patchGroup = (idx: number, patch: Partial<LocalMenuOptionGroupRow>) => {
    onChange(groups.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  };

  const addOption = (gIdx: number) => {
    const g = groups[gIdx];
    const nextOpts = [
      ...g.options,
      {
        _key: newKey(),
        name: "",
        sortOrder: g.options.length,
        priceDelta: "0",
        costDelta: "",
        sku: "",
        isDefault: false,
        isActive: true,
        ingredients: [],
      },
    ];
    patchGroup(gIdx, { options: nextOpts });
  };

  const removeOption = (gIdx: number, oIdx: number) => {
    onChange(
      groups.map((gr, i) =>
        i === gIdx ? { ...gr, options: gr.options.filter((_, j) => j !== oIdx) } : gr
      )
    );
  };

  const patchOption = (gIdx: number, oIdx: number, patch: Partial<LocalMenuOptionRow>) => {
    const g = groups[gIdx];
    const options = g.options.map((o, j) => (j === oIdx ? { ...o, ...patch } : o));
    patchGroup(gIdx, { options });
  };

  const addOptionIngredient = (gIdx: number, oIdx: number) => {
    const g = groups[gIdx];
    const o = g.options[oIdx];
    const nextIng = [
      ...o.ingredients,
      { inventoryItemId: "", quantity: 0, unit: "KG" as UnitType },
    ];
    patchOption(gIdx, oIdx, { ingredients: nextIng });
  };

  const updateOptionIngredient = (
    gIdx: number,
    oIdx: number,
    ingIdx: number,
    field: keyof OptionIngredientRow,
    value: string | number
  ) => {
    const g = groups[gIdx];
    const o = g.options[oIdx];
    const ingredients = [...o.ingredients];
    if (field === "inventoryItemId") {
      const itemData = inventoryItems.find((i) => i.id === value);
      ingredients[ingIdx] = {
        ...ingredients[ingIdx],
        inventoryItemId: value as string,
        inventoryItemName: itemData?.name,
        unit: itemData?.unit || ingredients[ingIdx].unit,
        unitCost: itemData?.unitCost,
      };
    } else {
      ingredients[ingIdx] = { ...ingredients[ingIdx], [field]: value } as OptionIngredientRow;
    }
    patchOption(gIdx, oIdx, { ingredients });
  };

  const removeOptionIngredient = (gIdx: number, oIdx: number, ingIdx: number) => {
    const o = groups[gIdx].options[oIdx];
    patchOption(gIdx, oIdx, {
      ingredients: o.ingredients.filter((_, i) => i !== ingIdx),
    });
  };

  const openInventory = useCallback(() => {
    onEnsureInventory();
  }, [onEnsureInventory]);

  return (
    <Collapsible onOpenChange={(open) => open && openInventory()}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" type="button" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Option groups (variants)
            {groups.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {groups.length}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Up to {MAX_OPTION_GROUPS_PER_MENU_ITEM} groups (e.g. Size, Temperature). Each option can add a price delta
          and optional extra recipe lines (BOM deltas).
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addGroup}
          disabled={groups.length >= MAX_OPTION_GROUPS_PER_MENU_ITEM}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add option group
        </Button>

        {groups.map((g, gi) => (
          <div key={g._key} className="rounded-lg border p-4 space-y-3 bg-muted/20">
            <div className="flex items-start justify-between gap-2">
              <div className="grid gap-2 flex-1 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Group name *</Label>
                  <Input
                    value={g.name}
                    onChange={(e) => patchGroup(gi, { name: e.target.value })}
                    placeholder="e.g. Size"
                  />
                </div>
                <div className="flex items-end gap-3 pb-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={g.isRequired}
                      onCheckedChange={(checked) =>
                        patchGroup(gi, {
                          isRequired: checked,
                          minSelections: checked
                            ? parseInt(g.minSelections, 10) > 0
                              ? g.minSelections
                              : "1"
                            : "0",
                        })
                      }
                    />
                    <span className="text-xs">Required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={g.isActive}
                      onCheckedChange={(c) => patchGroup(gi, { isActive: c })}
                    />
                    <span className="text-xs">Active</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Min selections</Label>
                  <Input
                    inputMode="numeric"
                    value={g.minSelections}
                    onChange={(e) => patchGroup(gi, { minSelections: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max selections</Label>
                  <Input
                    inputMode="numeric"
                    value={g.maxSelections}
                    onChange={(e) => patchGroup(gi, { maxSelections: e.target.value })}
                  />
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeGroup(gi)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Options</Label>
                <Button type="button" size="sm" variant="secondary" onClick={() => addOption(gi)}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add option
                </Button>
              </div>
              {g.options.map((o, oi) => (
                <div key={o._key} className="rounded-md border bg-background p-3 space-y-2">
                  <div className="flex justify-between gap-2">
                    <div className="grid gap-2 flex-1 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Name *</Label>
                        <Input
                          className="h-8 text-xs"
                          value={o.name}
                          onChange={(e) => patchOption(gi, oi, { name: e.target.value })}
                          placeholder="e.g. Large"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">SKU (optional)</Label>
                        <Input
                          className="h-8 text-xs"
                          value={o.sku}
                          onChange={(e) =>
                            patchOption(gi, oi, { sku: e.target.value.toUpperCase() })
                          }
                          placeholder="OPT-LG"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Price +/−</Label>
                        <Input
                          className="h-8 text-xs"
                          type="number"
                          step="0.01"
                          value={o.priceDelta}
                          onChange={(e) => patchOption(gi, oi, { priceDelta: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Cost +/− (optional)</Label>
                        <Input
                          className="h-8 text-xs"
                          type="number"
                          step="0.01"
                          value={o.costDelta}
                          onChange={(e) => patchOption(gi, oi, { costDelta: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={() => removeOption(gi, oi)}
                      disabled={g.options.length <= 1}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={o.isDefault}
                        onCheckedChange={(c) => patchOption(gi, oi, { isDefault: c })}
                      />
                      <span className="text-xs">Default</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={o.isActive}
                        onCheckedChange={(c) => patchOption(gi, oi, { isActive: c })}
                      />
                      <span className="text-xs">Active</span>
                    </div>
                  </div>

                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => openInventory()}
                      >
                        Extra ingredients ({o.ingredients.length})
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 space-y-2">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => addOptionIngredient(gi, oi)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add line
                        </Button>
                      </div>
                      {o.ingredients.map((ing, ingIdx) => (
                        <div
                          key={`${o._key}-ing-${ingIdx}`}
                          className="flex flex-wrap items-center gap-2 rounded border p-2"
                        >
                          <div className="flex-1 min-w-[140px]">
                            <Combobox
                              options={inventoryItems.map((item) => ({
                                value: item.id,
                                label: item.name,
                                description: item.sku,
                              }))}
                              value={ing.inventoryItemId}
                              onValueChange={(value) =>
                                updateOptionIngredient(gi, oi, ingIdx, "inventoryItemId", value)
                              }
                              placeholder="Inventory item"
                              searchPlaceholder="Search…"
                              emptyText="No items"
                              className="h-8 text-xs"
                            />
                          </div>
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            className="w-20 h-8 text-xs"
                            placeholder="Qty"
                            value={ing.quantity || ""}
                            onChange={(e) =>
                              updateOptionIngredient(
                                gi,
                                oi,
                                ingIdx,
                                "quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                          <Select
                            value={ing.unit}
                            onValueChange={(value) =>
                              updateOptionIngredient(gi, oi, ingIdx, "unit", value)
                            }
                          >
                            <SelectTrigger className="w-24 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {unitOptions.map((unit) => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeOptionIngredient(gi, oi, ingIdx)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
