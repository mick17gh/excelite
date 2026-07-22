"use client";

import { useState, useMemo, useEffect } from "react";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ContentCard } from "@/components/dashboard/content-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Image as ImageIcon,
  Package,
  DollarSign,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import {
  AddMenuItemForm,
  EditMenuItemForm,
  type BranchOption,
} from "@/components/menu/menu-forms";
import { BulkImportDialog } from "@/components/bulk-import-dialog";
import { ProductGridCard } from "@/components/menu/product-grid-card";
import { deleteMenuItem } from "@/lib/actions/menu";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { TablePagination } from "@/components/ui/table-pagination";
import { orderTabListClass, ordersToolbarClass } from "@/components/orders/order-styles";
import { cn } from "@/lib/utils";

interface MenuItem {
  id: string;
  name: string;
  sku: string;
  categoryId?: string | null;
  category: string;
  price: number;
  cost: number;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  availableAtAllBranches?: boolean;
  branchIds?: string[];
}

interface CategoryOption {
  id: string;
  name: string;
}

interface MenuContentProps {
  items: MenuItem[];
  categories: CategoryOption[];
  branches?: BranchOption[];
}

function visibilityBadge(
  item: MenuItem,
  branches: BranchOption[]
): { label: string; title?: string } {
  if (item.availableAtAllBranches !== false) {
    return { label: "Visible: all branches" };
  }
  const ids = item.branchIds ?? [];
  const names = branches
    .filter((b) => ids.includes(b.id))
    .map((b) => b.name);
  return {
    label: `Visible: ${ids.length} branch${ids.length === 1 ? "" : "es"}`,
    title: names.length > 0 ? names.join(", ") : undefined,
  };
}

export function MenuContent({
  items,
  categories,
  branches = [],
}: MenuContentProps) {
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkOptionsImportOpen, setIsBulkOptionsImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.isActive) ||
        (statusFilter === "inactive" && !item.isActive);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchQuery, categoryFilter, statusFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter]);

  // Paginated items
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    const result = await deleteMenuItem(id);
    if (result.success) {
      toast.success("Menu item deleted successfully");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete menu item");
    }
  };

  const totalItems = items.length;
  const activeItems = items.filter((i) => i.isActive).length;
  const totalValue = items.reduce((sum, i) => sum + i.price, 0);
  const avgMargin =
    items.length > 0
      ? items.reduce(
          (sum, i) => sum + ((i.price - i.cost) / i.price) * 100,
          0,
        ) / items.length
      : 0;

  const groupedByCategory = filteredItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, MenuItem[]>,
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Items" value={totalItems} icon={Package} />
        <KPICard title="Active" value={activeItems} icon={TrendingUp} />
        <KPICard title="Avg Margin" value={avgMargin} format="percentage" icon={DollarSign} />
        <KPICard title="Categories" value={categories.length} icon={Package} />
      </div>

      {/* Filters and Actions */}
      <ContentCard>
        <div className={ordersToolbarClass}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center flex-1">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 rounded-xl bg-background border-border/80 focus-visible:ring-[#22C55E]/30"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36 h-10 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button variant="outline" className="rounded-xl h-10" onClick={() => setIsBulkImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button variant="outline" className="rounded-xl h-10" onClick={() => setIsBulkOptionsImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import options
              </Button>
              <Button
                onClick={() => setIsAddOpen(true)}
                className="rounded-xl h-10 bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add product
              </Button>
            </div>
          </div>
        </div>
      </ContentCard>

      {/* Content Tabs */}
      <Tabs defaultValue="grid" className="w-full">
        <TabsList className={cn(orderTabListClass, "w-full sm:w-auto inline-flex h-11")}>
          <TabsTrigger
            value="grid"
            className="rounded-lg px-4 data-[state=active]:bg-[#22C55E] data-[state=active]:text-white"
          >
            Grid
          </TabsTrigger>
          <TabsTrigger
            value="list"
            className="rounded-lg px-4 data-[state=active]:bg-[#22C55E] data-[state=active]:text-white"
          >
            List
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="rounded-lg px-4 data-[state=active]:bg-[#22C55E] data-[state=active]:text-white"
          >
            By category
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-5">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {paginatedItems.map((item) => (
              <ProductGridCard
                key={item.id}
                item={item}
                branches={branches}
                formatCurrency={formatCurrency}
                onEdit={() => setEditingItem(item)}
                onDelete={() => handleDelete(item.id, item.name)}
              />
            ))}
          </div>
          {filteredItems.length === 0 && (
            <ContentCard className="mt-4" padding="none">
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#22C55E]/10 mb-4">
                  <Package className="h-8 w-8 text-[#16A34A]/60" />
                </div>
                <h3 className="font-semibold text-[#222831] mb-1">No products found</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Adjust your filters or add your first product to get started
                </p>
                <Button
                  className="mt-4 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-xl"
                  onClick={() => setIsAddOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add product
                </Button>
              </div>
            </ContentCard>
          )}
          {filteredItems.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredItems.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <ContentCard>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.imageUrl && (
                            <div className="relative h-10 w-10 rounded overflow-hidden bg-muted">
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.sku}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell>{formatCurrency(item.cost)}</TableCell>
                      <TableCell>
                        <span className="text-emerald-600 font-medium">
                          {(
                            ((item.price - item.cost) / item.price) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const vis = visibilityBadge(item, branches);
                          return (
                            <Badge
                              variant="outline"
                              className="text-xs font-normal"
                              title={vis.title}
                            >
                              {vis.label}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingItem(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(item.id, item.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredItems.length > 0 && (
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredItems.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                />
              )}
          </ContentCard>
        </TabsContent>

        <TabsContent value="categories" className="mt-5">
          <div className="space-y-4">
            {Object.entries(groupedByCategory).map(
              ([category, categoryItems]) => (
                <ContentCard key={category} padding="none" className="overflow-hidden">
                  <div className="excelite-header-gradient px-4 py-3 flex items-center gap-2 border-b border-white/10">
                    <Package className="h-4 w-4 text-white/90" />
                    <span className="font-semibold text-white">{category}</span>
                    <Badge className="ml-auto bg-white/20 text-white border-0 hover:bg-white/20">
                      {categoryItems.length}
                    </Badge>
                  </div>
                  <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {categoryItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="flex items-center gap-3 rounded-xl border border-border/80 bg-card p-3 text-left transition-all hover:border-[#22C55E]/40 hover:shadow-sm"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#22C55E]/8">
                          {item.imageUrl ? (
                            <Image src={item.imageUrl} alt="" fill className="object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-[#16A34A]/40" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-[#222831] truncate">{item.name}</p>
                          <p className="text-xs font-semibold text-[#16A34A]">{formatCurrency(item.price)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ContentCard>
              ),
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Forms */}
      <AddMenuItemForm
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        categories={categories}
        branches={branches}
      />
      {editingItem && (
        <EditMenuItemForm
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          item={editingItem}
          categories={categories}
          branches={branches}
        />
      )}

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        type="menu"
        branches={branches}
        onSuccess={() => router.refresh()}
      />
      <BulkImportDialog
        open={isBulkOptionsImportOpen}
        onOpenChange={setIsBulkOptionsImportOpen}
        type="menu-options"
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
