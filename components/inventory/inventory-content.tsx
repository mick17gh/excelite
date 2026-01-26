"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Trash2,
  Download,
  MoreHorizontal,
  Upload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  InboundStockForm,
  OutboundStockForm,
  WasteLogForm,
  TransferForm,
  AddInventoryItemForm,
} from "@/components/inventory/inventory-forms";
import { BulkImportDialog } from "@/components/bulk-import-dialog";
import { useCurrency } from "@/contexts/currency-context";
import { useBranchCurrency } from "@/hooks/use-branch-currency";
import { useBranchRestrictions, filterBranchesForUser } from "@/hooks/use-branch-restrictions";
import { EmptyState } from "@/components/ui/empty-state";
import { downloadCSV, formatDateForFilename } from "@/lib/utils/export";
import { TablePagination } from "@/components/ui/table-pagination";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  branchId: string;
  branchName: string;
  status: "critical" | "low" | "normal" | "overstock";
}

interface Branch {
  id: string;
  name: string;
  code: string;
  currency?: string | null;
}

interface InboundRecord {
  id: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  invoiceNumber: string | null;
  deliveryDate: Date;
  createdAt: Date;
  item: { name: string; sku: string };
  supplier: { name: string };
  branch: { name: string };
}

interface OutboundRecord {
  id: string;
  quantity: number;
  movementType: string;
  reason: string | null;
  createdAt: Date;
  item: { name: string; sku: string };
  branch: { name: string };
}

interface TransferRecord {
  id: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  transferDate: Date;
  status: string;
  createdAt: Date;
  item: { name: string; sku: string };
  fromBranch: { name: string };
  toBranch: { name: string };
}

interface InventoryContentProps {
  items: InventoryItem[];
  branches: Branch[];
  inboundRecords?: InboundRecord[];
  outboundRecords?: OutboundRecord[];
  transferRecords?: TransferRecord[];
}

export function InventoryContent({ 
  items, 
  branches, 
  inboundRecords = [], 
  outboundRecords = [], 
  transferRecords = [] 
}: InventoryContentProps) {
  const { formatCurrency } = useCurrency();
  const { canViewAllBranches, userBranchId, isLoading: authLoading } = useBranchRestrictions();
  
  // Filter branches based on user permissions
  const availableBranches = filterBranchesForUser(branches, canViewAllBranches, userBranchId);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Auto-select user's branch if they're restricted
  useEffect(() => {
    if (!authLoading && !canViewAllBranches && userBranchId) {
      setBranchFilter(userBranchId);
    }
  }, [authLoading, canViewAllBranches, userBranchId]);

  // Set currency based on selected branch filter
  const selectedBranchId = branchFilter !== "all" ? branchFilter : null;
  useBranchCurrency(selectedBranchId, branches);
  
  // Form states
  const [isInboundOpen, setIsInboundOpen] = useState(false);
  const [isOutboundOpen, setIsOutboundOpen] = useState(false);
  const [isWasteOpen, setIsWasteOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      const matchesBranch =
        branchFilter === "all" || item.branchId === branchFilter;
      return matchesSearch && matchesStatus && matchesCategory && matchesBranch;
    });
    
    console.log('Filter Debug:', {
      totalItems: items.length,
      searchQuery,
      statusFilter,
      categoryFilter,
      branchFilter,
      filteredCount: filtered.length,
      sampleFiltered: filtered.slice(0, 3).map(i => ({ name: i.name, sku: i.sku, branchId: i.branchId }))
    });
    
    return filtered;
  }, [items, searchQuery, statusFilter, categoryFilter, branchFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter, branchFilter]);

  // Paginated items
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Debug logging
  console.log('Inventory Pagination Debug:', {
    totalItems: items.length,
    filteredItems: filteredItems.length,
    currentPage,
    pageSize,
    totalPages,
    paginatedItems: paginatedItems.length,
    searchQuery,
    statusFilter,
    categoryFilter,
    branchFilter
  });

  const categories = [...new Set(items.map((i) => i.category))];

  const criticalItems = items.filter((i) => i.status === "critical").length;
  const lowStockItems = items.filter((i) => i.status === "low").length;
  const overstockItems = items.filter((i) => i.status === "overstock").length;
  const totalValue = items.reduce(
    (sum, i) => sum + i.currentStock * i.unitCost,
    0
  );

  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "critical":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Critical
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Low Stock
          </Badge>
        );
      case "overstock":
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            Overstock
          </Badge>
        );
      default:
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            Normal
          </Badge>
        );
    }
  };

  const getStockPercentage = (current: number, min: number, max: number) => {
    return Math.min((current / max) * 100, 100);
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case "critical":
        return "bg-red-500";
      case "low":
        return "bg-amber-500";
      case "overstock":
        return "bg-blue-500";
      default:
        return "bg-emerald-500";
    }
  };

  const { formatCurrencyShort } = useCurrency();

  return (
    <div className="space-y-4">
      {/* Summary Cards - Compact */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Inventory Value</p>
                <p className="text-base font-bold mt-0.5 truncate">
                  {totalValue >= 10000 ? formatCurrencyShort(totalValue) : formatCurrency(totalValue)}
                </p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <Package className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl border-red-200/50 dark:border-red-800/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Critical</p>
                <p className="text-base font-bold mt-0.5 text-red-600">{criticalItems}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl border-amber-200/50 dark:border-amber-800/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Low Stock</p>
                <p className="text-base font-bold mt-0.5 text-amber-600">{lowStockItems}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-amber-100 dark:bg-amber-900/30">
                <TrendingDown className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl border-blue-200/50 dark:border-blue-800/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Overstock</p>
                <p className="text-base font-bold mt-0.5 text-blue-600">{overstockItems}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-blue-100 dark:bg-blue-900/30">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different inventory views */}
      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs h-7">All Items</TabsTrigger>
            <TabsTrigger value="inbound" className="text-xs h-7">Inbound</TabsTrigger>
            <TabsTrigger value="outbound" className="text-xs h-7">Outbound</TabsTrigger>
            <TabsTrigger value="transfers" className="text-xs h-7">Transfers</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                const exportData = filteredItems.map((i) => ({
                  Name: i.name,
                  SKU: i.sku,
                  Category: i.category,
                  Branch: i.branchName,
                  "Current Stock": i.currentStock,
                  Unit: i.unit,
                  "Unit Cost": i.unitCost,
                  "Total Value": i.currentStock * i.unitCost,
                  Status: i.status,
                }));
                downloadCSV(exportData, `inventory-${formatDateForFilename()}`);
              }}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setIsBulkImportOpen(true)}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Import CSV
            </Button>
            <Button size="sm" className="h-8" onClick={() => setIsAddItemOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Item
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  Actions
                  <MoreHorizontal className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsInboundOpen(true)}>
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  Record Inbound
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsOutboundOpen(true)}>
                  <ArrowUpFromLine className="mr-2 h-4 w-4" />
                  Record Outbound
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsWasteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Log Waste
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsTransferOpen(true)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Transfer Stock
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center mt-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="overstock">Overstock</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="all" className="mt-6">
          <Card className="glass">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32">
                        <EmptyState
                          icon={<Package className="h-8 w-8 text-muted-foreground" />}
                          title="No inventory items found"
                          description="Try adjusting your filters or add a new inventory item."
                          action={{
                            label: "Add Item",
                            onClick: () => setIsAddItemOpen(true),
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.sku}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.category}</Badge>
                      </TableCell>
                      <TableCell>{item.branchName}</TableCell>
                      <TableCell>
                        <div className="w-32 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>
                              {item.currentStock} {item.unit}
                            </span>
                            <span className="text-muted-foreground">
                              / {item.maxStock}
                            </span>
                          </div>
                          <Progress
                            value={getStockPercentage(
                              item.currentStock,
                              item.minStock,
                              item.maxStock
                            )}
                            className={`h-2 ${getStockColor(item.status)}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitCost)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.currentStock * item.unitCost)}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inbound" className="mt-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Recent Inbound Stock</CardTitle>
            </CardHeader>
            <CardContent>
              {inboundRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inboundRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.item.name}</p>
                            <p className="text-sm text-muted-foreground">{record.item.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{record.supplier.name}</TableCell>
                        <TableCell>{record.quantity}</TableCell>
                        <TableCell>{formatCurrency(record.unitCost)}</TableCell>
                        <TableCell>{formatCurrency(record.totalCost)}</TableCell>
                        <TableCell>{record.invoiceNumber || "-"}</TableCell>
                        <TableCell>{new Date(record.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">
                  No inbound stock records found. Use the (Record Inbound) button to add new deliveries.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outbound" className="mt-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Recent Outbound Stock</CardTitle>
            </CardHeader>
            <CardContent>
              {outboundRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outboundRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.item.name}</p>
                            <p className="text-sm text-muted-foreground">{record.item.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {record.movementType.replace('OUTBOUND_', '').replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.quantity}</TableCell>
                        <TableCell>{record.reason || "-"}</TableCell>
                        <TableCell>{record.branch.name}</TableCell>
                        <TableCell>{new Date(record.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">
                  No outbound stock records found. Records will appear here when items are sold, wasted, or adjusted.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="mt-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Stock Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              {transferRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transferRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.item.name}</p>
                            <p className="text-sm text-muted-foreground">{record.item.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{record.fromBranch.name}</TableCell>
                        <TableCell>{record.toBranch.name}</TableCell>
                        <TableCell>{record.quantity}</TableCell>
                        <TableCell>{formatCurrency(record.totalCost)}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === 'COMPLETED' ? 'default' : 'secondary'}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(record.transferDate).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">
                  No transfer records found. Use the transfer button to initiate inter-branch transfers.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Forms */}
      <InboundStockForm
        open={isInboundOpen}
        onOpenChange={setIsInboundOpen}
        branches={branches}
        items={items}
      />
      <OutboundStockForm
        open={isOutboundOpen}
        onOpenChange={setIsOutboundOpen}
        branches={branches}
        items={items}
      />
      <WasteLogForm
        open={isWasteOpen}
        onOpenChange={setIsWasteOpen}
        branches={branches}
        items={items}
      />
      <TransferForm
        open={isTransferOpen}
        onOpenChange={setIsTransferOpen}
        branches={branches}
        items={items}
      />
      <AddInventoryItemForm
        open={isAddItemOpen}
        onOpenChange={setIsAddItemOpen}
        branches={branches}
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        type="inventory"
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
