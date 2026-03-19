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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChefHat, Plus, Pencil, Trash2, Loader2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { getBranches } from "@/lib/actions/branches";
import {
  listKitchenStations,
  createKitchenStation,
  updateKitchenStation,
  deleteKitchenStation,
} from "@/lib/actions/kitchen";

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

interface StationFormState {
  name: string;
  description: string;
  categories: string;
}

const emptyForm: StationFormState = { name: "", description: "", categories: "" };

export function KitchenStationsTab() {
  const [isPending, startTransition] = useTransition();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [form, setForm] = useState<StationFormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Station | null>(null);

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
    listKitchenStations(selectedBranch).then((res) => {
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
      categories: station.categories || "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Station name is required");
      return;
    }
    startTransition(async () => {
      if (editingStation) {
        const res = await updateKitchenStation({
          id: editingStation.id,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          categories: form.categories.trim() || undefined,
        });
        if (res.success) {
          toast.success("Station updated");
          setDialogOpen(false);
          const refresh = await listKitchenStations(selectedBranch);
          setStations((refresh.success && refresh.data ? refresh.data : []) as Station[]);
        } else {
          toast.error(res.error || "Failed to update station");
        }
      } else {
        const res = await createKitchenStation({
          branchId: selectedBranch,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          categories: form.categories.trim() || undefined,
        });
        if (res.success) {
          toast.success("Station created");
          setDialogOpen(false);
          const refresh = await listKitchenStations(selectedBranch);
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
        const refresh = await listKitchenStations(selectedBranch);
        setStations((refresh.success && refresh.data ? refresh.data : []) as Station[]);
      } else {
        toast.error(res.error || "Failed to update station");
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteKitchenStation(deleteTarget.id);
      if (res.success) {
        toast.success("Station deleted");
        setDeleteTarget(null);
        const refresh = await listKitchenStations(selectedBranch);
        setStations((refresh.success && refresh.data ? refresh.data : []) as Station[]);
      } else {
        toast.error(res.error || "Failed to delete station");
      }
    });
  };

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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(station)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
              <Label className="text-xs">Menu Categories (comma-separated)</Label>
              <Input
                value={form.categories}
                onChange={(e) => setForm({ ...form, categories: e.target.value })}
                placeholder="e.g., Mains, Desserts, Drinks"
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Used to route specific menu categories to this station
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Station</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This cannot be undone.
              Existing kitchen tickets for this station will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
