"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createInventoryCategory,
  updateInventoryCategory,
  deleteOrArchiveInventoryCategory,
} from "@/lib/actions/inventory-categories";

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
}: {
  categories: InventoryCategoryRow[];
}) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryCategoryRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    sortOrder: "0",
  });

  const resetForm = () => setFormData({ name: "", code: "", sortOrder: "0" });

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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-3">
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Categories</p>
            <p className="text-base font-bold">{categories.length}</p>
          </CardContent>
        </Card>
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Inventory links</p>
            <p className="text-base font-bold">
              {categories.reduce((s, c) => s + c.inventoryItemCount, 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Warehouse links</p>
            <p className="text-base font-bold">
              {categories.reduce((s, c) => s + c.warehouseItemCount, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Category
        </Button>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Inventory Categories</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Inventory Items</TableHead>
                <TableHead>Warehouse Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.code}</TableCell>
                  <TableCell>{row.inventoryItemCount}</TableCell>
                  <TableCell>{row.warehouseItemCount}</TableCell>
                  <TableCell>
                    <Badge variant={row.isActive ? "secondary" : "outline"}>
                      {row.isActive ? "Active" : "Archived"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(row);
                          setFormData({
                            name: row.name,
                            code: row.code,
                            sortOrder: String(row.sortOrder),
                          });
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleArchive(row)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create inventory category</DialogTitle>
            <DialogDescription>Used across inventory and warehouse.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData((v) => ({ ...v, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Code</Label>
              <Input value={formData.code} onChange={(e) => setFormData((v) => ({ ...v, code: e.target.value.toUpperCase() }))} />
            </div>
            <div className="grid gap-2">
              <Label>Sort order</Label>
              <Input type="number" value={formData.sortOrder} onChange={(e) => setFormData((v) => ({ ...v, sortOrder: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit inventory category</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData((v) => ({ ...v, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Code</Label>
              <Input value={formData.code} onChange={(e) => setFormData((v) => ({ ...v, code: e.target.value.toUpperCase() }))} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
