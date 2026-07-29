"use client";

import { useState, useMemo, useEffect } from "react";
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
  Plus,
  Edit,
  Trash2,
  Tag,
  Package,
  Upload,
  Search,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/categories";
import { BulkImportDialog } from "@/components/bulk-import-dialog";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  dashboardModalHeaderClass,
  dashboardModalContentClass,
  dashboardPrimaryButtonClass,
  dashboardToolbarClass,
} from "@/components/dashboard/dashboard-theme";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  itemCount: number;
}

interface CategoriesContentProps {
  categories: Category[];
  hideStats?: boolean;
}

export function CategoriesContent({ categories: initialCategories, hideStats }: CategoriesContentProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createCategory({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });

      if (result.success) {
        toast.success("Category created successfully");
        setIsCreateOpen(false);
        setFormData({ name: "", description: "" });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create category");
      }
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Failed to create category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: "" });
  };

  const handleUpdate = async () => {
    if (!editingCategory || !formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateCategory({
        id: editingCategory.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });

      if (result.success) {
        toast.success("Category updated successfully");
        setEditingCategory(null);
        setFormData({ name: "", description: "" });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update category");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (categoryId: string, categoryName: string, itemCount: number) => {
    if (itemCount > 0) {
      toast.error(`Cannot delete category. ${itemCount} menu item(s) are using it.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete category "${categoryName}"?`)) {
      return;
    }

    const result = await deleteCategory(categoryId);
    if (result.success) {
      toast.success("Category deleted successfully");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete category");
    }
  };

  const totalCategories = initialCategories.length;
  const totalItems = initialCategories.reduce((sum, cat) => sum + cat.itemCount, 0);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return initialCategories;
    const q = searchQuery.toLowerCase();
    return initialCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [initialCategories, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / pageSize));
  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCategories.slice(startIndex, startIndex + pageSize);
  }, [filteredCategories, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-4">
      {!hideStats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KPICard title="Categories" value={totalCategories} icon={Tag} />
          <KPICard title="Menu Items" value={totalItems} icon={Package} />
          <KPICard
            title="Avg per Category"
            value={totalCategories > 0 ? Math.round(totalItems / totalCategories) : 0}
            icon={TrendingUp}
          />
        </div>
      )}

      <ContentCard padding="none">
        <div className={dashboardToolbarClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 rounded-xl pl-9"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => setIsBulkImportOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button
                className={dashboardPrimaryButtonClass}
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add category
              </Button>
            </div>
          </div>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#22C55E]/10 mb-4">
              <Tag className="h-8 w-8 text-[#16A34A]/60" />
            </div>
            <h3 className="font-semibold text-[#222831] mb-1">No categories found</h3>
            <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
              Create your first category to organize menu items
            </p>
            <Button className={dashboardPrimaryButtonClass} onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add category
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Category Name</TableHead>
                  <TableHead>Menu Items</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCategories.map((category) => (
                  <TableRow key={category.id} className="hover:bg-[#22C55E]/5">
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-[#22C55E]/25 bg-[#22C55E]/8 text-[#16A34A]"
                      >
                        {category.itemCount} items
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                          onClick={() => handleDelete(category.id, category.name, category.itemCount)}
                          disabled={category.itemCount > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
          </>
        )}
      </ContentCard>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className={cn(dashboardModalContentClass, "sm:max-w-[500px]")}>
          <DialogHeader className={cn(dashboardModalHeaderClass, "text-left")}>
            <DialogTitle className="text-white">Create Category</DialogTitle>
            <DialogDescription className="text-white/80">
              Add a new category to organize your menu items
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Category Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Appetizers, Main Course, Desserts"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Brief description of this category"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button variant="outline" className="rounded-xl" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button className={dashboardPrimaryButtonClass} onClick={handleCreate} disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className={cn(dashboardModalContentClass, "sm:max-w-[500px]")}>
          <DialogHeader className={cn(dashboardModalHeaderClass, "text-left")}>
            <DialogTitle className="text-white">Edit Category</DialogTitle>
            <DialogDescription className="text-white/80">
              Update category name. This will update all menu items using this category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                Category Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                placeholder="e.g., Appetizers, Main Course, Desserts"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>
            {editingCategory && editingCategory.itemCount > 0 && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> This category has {editingCategory.itemCount} menu item(s).
                  Changing the name will update all items.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditingCategory(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button className={dashboardPrimaryButtonClass} onClick={handleUpdate} disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? "Updating..." : "Update Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkImportDialog
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        type="category"
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
