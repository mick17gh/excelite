"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ContentCard } from "@/components/dashboard/content-card";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TablePagination } from "@/components/ui/table-pagination";
import { Edit, Plus, RotateCcw, Trash2, Layers, Package, Warehouse } from "lucide-react";
import { toast } from "sonner";
import {
  createInventoryCategory,
  updateInventoryCategory,
  deleteOrArchiveInventoryCategory,
  restoreInventoryCategory,
} from "@/lib/actions/inventory-categories";
import {
  dashboardModalHeaderClass,
  dashboardModalContentClass,
  dashboardPrimaryButtonClass,
  dashboardToolbarClass,
  stockStatusBadgeClass,
} from "@/components/dashboard/dashboard-theme";
import { cn } from "@/lib/utils";

interface InventoryCategoryRow {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  sortOrder: number;
  inventoryItemCount: number;
  warehouseItemCount: number;
  totalItemCount: number;
}

export function InventoryCategoriesContent({
  categories,
  hideStats,
}: {
  categories: InventoryCategoryRow[];
  hideStats?: boolean;
}) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryCategoryRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    sortOrder: "0",
    isActive: true,
  });

  const resetForm = () =>
    setFormData({ name: "", code: "", sortOrder: "0", isActive: true });

  const filteredCategories = categories.filter((row) => {
    if (statusFilter === "active") return row.isActive;
    if (statusFilter === "archived") return !row.isActive;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / pageSize));
  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCategories.slice(startIndex, startIndex + pageSize);
  }, [filteredCategories, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const archivedCount = categories.filter((c) => !c.isActive).length;

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    setIsSubmitting(true);
    const res = await createInventoryCategory({
      name: formData.name,
      code: formData.code,
      sortOrder: Number(formData.sortOrder || "0"),
    });
    setIsSubmitting(false);
    if (!res.success) {
      toast.error(res.error || "Failed to create category");
      return;
    }
    toast.success("Category created");
    setIsCreateOpen(false);
    resetForm();
    router.refresh();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setIsSubmitting(true);
    const res = await updateInventoryCategory({
      id: editing.id,
      name: formData.name,
      code: formData.code,
      sortOrder: Number(formData.sortOrder || "0"),
      isActive: formData.isActive,
    });
    setIsSubmitting(false);
    if (!res.success) {
      toast.error(res.error || "Failed to update category");
      return;
    }
    toast.success("Category updated");
    setEditing(null);
    resetForm();
    router.refresh();
  };

  const handleArchive = async (row: InventoryCategoryRow) => {
    const res = await deleteOrArchiveInventoryCategory(row.id);
    if (!res.success) {
      toast.error(res.error || "Failed to archive category");
      return;
    }
    toast.success(row.totalItemCount > 0 ? "Category archived" : "Category deleted");
    router.refresh();
  };

  const handleRestore = async (row: InventoryCategoryRow) => {
    const res = await restoreInventoryCategory(row.id);
    if (!res.success) {
      toast.error(res.error || "Failed to restore category");
      return;
    }
    toast.success("Category restored");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {!hideStats && (
        <div className="grid gap-3 sm:grid-cols-3">
          <KPICard title="Categories" value={categories.length} icon={Layers} />
          <KPICard
            title="Inventory Links"
            value={categories.reduce((s, c) => s + c.inventoryItemCount, 0)}
            icon={Package}
          />
          <KPICard
            title="Warehouse Links"
            value={categories.reduce((s, c) => s + c.warehouseItemCount, 0)}
            icon={Warehouse}
          />
        </div>
      )}

      <ContentCard padding="none">
        <div className={dashboardToolbarClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground shrink-0">Show</Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as "all" | "active" | "archived")}
              >
                <SelectTrigger className="h-10 w-[160px] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({categories.length})</SelectItem>
                  <SelectItem value="active">
                    Active ({categories.length - archivedCount})
                  </SelectItem>
                  <SelectItem value="archived">Archived ({archivedCount})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className={dashboardPrimaryButtonClass}
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add category
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Inventory Items</TableHead>
              <TableHead>Warehouse Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  No categories match this filter.
                </TableCell>
              </TableRow>
            ) : null}
            {paginatedCategories.map((row) => (
              <TableRow key={row.id} className="hover:bg-[#22C55E]/5">
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>
                  <span className="font-mono text-xs">{row.code}</span>
                </TableCell>
                <TableCell>{row.inventoryItemCount}</TableCell>
                <TableCell>{row.warehouseItemCount}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={stockStatusBadgeClass(row.isActive ? "normal" : "critical")}
                  >
                    {row.isActive ? "Active" : "Archived"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => {
                        setEditing(row);
                        setFormData({
                          name: row.name,
                          code: row.code,
                          sortOrder: String(row.sortOrder),
                          isActive: row.isActive,
                        });
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {row.isActive ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => handleArchive(row)}
                        title="Archive category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => handleRestore(row)}
                        title="Restore category"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredCategories.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredCategories.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        )}
      </ContentCard>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className={cn(dashboardModalContentClass)}>
          <DialogHeader className={cn(dashboardModalHeaderClass, "text-left")}>
            <DialogTitle className="text-white">Create inventory category</DialogTitle>
            <DialogDescription className="text-white/80">
              Used across inventory and warehouse.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 p-6">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((v) => ({ ...v, name: e.target.value }))}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label>Code</Label>
              <Input
                value={formData.code}
                onChange={(e) =>
                  setFormData((v) => ({ ...v, code: e.target.value.toUpperCase() }))
                }
                className="h-10 rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData((v) => ({ ...v, sortOrder: e.target.value }))}
                className="h-10 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button variant="outline" className="rounded-xl" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button className={dashboardPrimaryButtonClass} onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editing}
        onOpenChange={(v) => {
          if (!v) {
            setEditing(null);
            resetForm();
          }
        }}
      >
        <DialogContent className={cn(dashboardModalContentClass)}>
          <DialogHeader className={cn(dashboardModalHeaderClass, "text-left")}>
            <DialogTitle className="text-white">Edit inventory category</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 p-6">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((v) => ({ ...v, name: e.target.value }))}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label>Code</Label>
              <Input
                value={formData.code}
                onChange={(e) =>
                  setFormData((v) => ({ ...v, code: e.target.value.toUpperCase() }))
                }
                className="h-10 rounded-xl"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Turn off to archive; archived categories are hidden from inventory and warehouse forms.
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((v) => ({ ...v, isActive: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setEditing(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button className={dashboardPrimaryButtonClass} onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
