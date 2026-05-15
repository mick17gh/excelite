"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChefHat, Plus, Pencil, Loader2, UtensilsCrossed, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { getBranches } from "@/lib/actions/branches";
import { getMenuCategories } from "@/lib/actions/menu";
import {
  listKitchenStations,
  createKitchenStation,
  updateKitchenStation,
} from "@/lib/actions/kitchen";
import {
  parseStationCategoryNames,
  serializeStationCategoryNames,
} from "@/lib/kitchen/category-routing";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Station {
  id: string;
  branchId: string;
  name: string;
  description: string | null;
  categories: string | null;
  isActive: boolean;
  createdAt: Date;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface MenuCategory {
  id: string;
  name: string;
}

interface StationFormState {
  name: string;
  description: string;
  categoryNames: string[];
}

const emptyForm: StationFormState = { name: "", description: "", categoryNames: [] };

export function KitchenStationsTab() {
  const [isPending, startTransition] = useTransition();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [form, setForm] = useState<StationFormState>(emptyForm);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  useEffect(() => {
    getMenuCategories().then((res) => {
      if (res.success && res.data) {
        setMenuCategories(res.data);
      }
    });
  }, []);

  useEffect(() => {
    getBranches().then((res) => {
      if (res.success && res.data) {
        setBranches(res.data);
        if (res.data.length > 0) setSelectedBranch(res.data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedBranch) return;
    setIsLoading(true);
    listKitchenStations(selectedBranch, { activeOnly: false }).then((res) => {
      setStations((res.success && res.data ? res.data : []) as Station[]);
      setIsLoading(false);
    });
  }, [selectedBranch]);

  const openCreate = () => {
    setEditingStation(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (station: Station) => {
    setEditingStation(station);
    setForm({
      name: station.name,
      description: station.description || "",
      categoryNames: parseStationCategoryNames(station.categories),
    });
    setDialogOpen(true);
  };

  const toggleCategory = (categoryName: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      categoryNames: checked
        ? [...prev.categoryNames, categoryName]
        : prev.categoryNames.filter((name) => name !== categoryName),
    }));
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Station name is required");
      return;
    }
    const categories = serializeStationCategoryNames(form.categoryNames);

    startTransition(async () => {
      if (editingStation) {
        const res = await updateKitchenStation({
          id: editingStation.id,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          categories,
        });
        if (res.success) {
          toast.success("Station updated");
          setDialogOpen(false);
          const refresh = await listKitchenStations(selectedBranch, { activeOnly: false });
          setStations((refresh.success && refresh.data ? refresh.data : []) as Station[]);
        } else {
          toast.error(res.error || "Failed to update station");
        }
      } else {
        const res = await createKitchenStation({
          branchId: selectedBranch,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          categories,
        });
        if (res.success) {
          toast.success("Station created");
          setDialogOpen(false);
          const refresh = await listKitchenStations(selectedBranch, { activeOnly: false });
          setStations((refresh.success && refresh.data ? refresh.data : []) as Station[]);
        } else {
          toast.error(res.error || "Failed to create station");
        }
      }
    });
  };

  const handleToggle = (station: Station) => {
    startTransition(async () => {
      const res = await updateKitchenStation({ id: station.id, isActive: !station.isActive });
      if (res.success) {
        const refresh = await listKitchenStations(selectedBranch, { activeOnly: false });
        setStations((refresh.success && refresh.data ? refresh.data : []) as Station[]);
      } else {
        toast.error(res.error || "Failed to update station");
      }
    });
  };

  const categoryTriggerLabel =
    form.categoryNames.length === 0
      ? "All menu categories (no filter)"
      : form.categoryNames.length === 1
        ? form.categoryNames[0]
        : `${form.categoryNames.length} categories selected`;

  return (
    <>
      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ChefHat className="h-4 w-4" />
                Kitchen Stations
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Manage kitchen display stations per branch
              </CardDescription>
            </div>
            <Button size="sm" className="h-8" onClick={openCreate} disabled={!selectedBranch}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Station
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Select Branch</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : stations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
              <UtensilsCrossed className="h-8 w-8 opacity-30" />
              <p className="text-sm">No kitchen stations configured</p>
              <p className="text-xs">Add a station to enable the kitchen display and POS kitchen toggle</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stations.map((station) => (
                <div
                  key={station.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5 bg-muted/20"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ChefHat className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{station.name}</span>
                        <Badge
                          variant={station.isActive ? "default" : "secondary"}
                          className="text-xs h-4 px-1.5"
                        >
                          {station.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {station.description && (
                        <p className="text-xs text-muted-foreground truncate">{station.description}</p>
                      )}
                      {station.categories && (
                        <p className="text-xs text-muted-foreground truncate">
                          Categories: {station.categories}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Switch
                      checked={station.isActive}
                      onCheckedChange={() => handleToggle(station)}
                      disabled={isPending}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(station)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingStation ? "Edit Station" : "Add Kitchen Station"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Station Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Main Kitchen, Grill Station"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Menu Categories</Label>
              <Popover open={categoriesOpen} onOpenChange={setCategoriesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-9 w-full justify-between font-normal",
                      form.categoryNames.length === 0 && "text-muted-foreground"
                    )}
                  >
                    <span className="truncate">{categoryTriggerLabel}</span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                  {menuCategories.length === 0 ? (
                    <p className="px-2 py-3 text-xs text-muted-foreground">
                      No menu categories found. Create categories under Menu first.
                    </p>
                  ) : (
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      {menuCategories.map((category) => {
                        const checked = form.categoryNames.includes(category.name);
                        return (
                          <label
                            key={category.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                toggleCategory(category.name, value === true)
                              }
                            />
                            <span>{category.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Only items in selected categories appear on this station. Leave empty to show all
                items.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {editingStation ? "Save Changes" : "Create Station"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
