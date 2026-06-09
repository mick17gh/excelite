"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  CheckCircle2,
  XCircle,
  ClipboardCheck,
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
  OutboundStockForm,
  WasteLogForm,
  TransferForm,
  BranchReturnToWarehouseDialog,
} from "@/components/inventory/inventory-forms";
import { BulkImportDialog } from "@/components/bulk-import-dialog";
import { updateBranchTransferStatus } from "@/lib/actions/inventory";
import { receiveWarehouseTransferAtBranch } from "@/lib/actions/warehouse";
import { TransferStatus } from "@/lib/generated/prisma/client";
import { toast } from "sonner";
import { useCurrency } from "@/contexts/currency-context";
import { useBranchCurrency } from "@/hooks/use-branch-currency";
import { useBranchRestrictions } from "@/hooks/use-branch-restrictions";
import { EmptyState } from "@/components/ui/empty-state";
import { downloadCSV, formatDateForFilename } from "@/lib/utils/export";
import { formatDisplayDate } from "@/lib/utils/date-display";
import { TablePagination } from "@/components/ui/table-pagination";
import { StockReconciliationDialog } from "@/components/inventory/stock-reconciliation-dialog";
import { ReconciliationHistoryPanel } from "@/components/inventory/reconciliation-history-panel";
import { authClient } from "@/lib/auth-client";
import { usePermissions } from "@/contexts/permissions-context";
import { getReconciliationStatusForDate } from "@/lib/actions/stock-reconciliation";

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

interface OutboundRecord {
  id: string;
  branchId?: string;
  quantity: number;
  movementType: string;
  reason: string | null;
  createdAt: Date;
  item: { name: string; sku: string };
  branch: { name: string };
}

interface TransferRecord {
  id: string;
  fromBranchId?: string;
  toBranchId?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  transferDate: Date;
  status: string;
  notes: string | null;
  approvedBy: string | null;
  receivedBy: string | null;
  createdAt: Date;
  item: { name: string; sku: string };
  fromBranch: { name: string };
  toBranch: { name: string };
}

interface WarehouseTransfer {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseItemId: string;
  itemName: string;
  itemSku: string;
  itemUnit: string;
  toBranchId: string;
  toBranchName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  status: string;
  transferDate: string;
  approvedBy: string | null;
  receivedBy: string | null;
  notes: string | null;
  createdAt: string;
}

const TRANSFER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  IN_TRANSIT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  AWAITING_WAREHOUSE_APPROVAL:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const RECEIVABLE_WAREHOUSE_TRANSFER_STATUSES = new Set(["PENDING", "APPROVED", "IN_TRANSIT"]);

interface BranchWarehouseReturn {
  id: string;
  fromBranchId: string;
  toWarehouseId: string;
  branchItemId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  status: string;
  transferDate: string;
  notes: string | null;
  createdAt: string;
  branchName: string;
  warehouseName: string;
  itemName: string;
  itemSku: string;
  itemUnit: string;
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

interface InventoryContentProps {
  items: InventoryItem[];
  branches: Branch[];
  categories: Array<{ id: string; name: string; code: string }>;
  warehouses?: WarehouseOption[];
  outboundRecords?: OutboundRecord[];
  transferRecords?: TransferRecord[];
  warehouseTransfers?: WarehouseTransfer[];
  branchReturns?: BranchWarehouseReturn[];
}

export function InventoryContent({ 
  items, 
  branches,
  categories,
  warehouses = [],
  outboundRecords = [], 
  transferRecords = [],
  warehouseTransfers = [],
  branchReturns = [],
}: InventoryContentProps) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const { canViewAllBranches, userBranchId, userRole, isLoading: authLoading } = useBranchRestrictions();
  const { hasPermission } = usePermissions();
  const canReconcile = hasPermission("inventory:reconcile");
  const canReceiveWarehouseTransfer = hasPermission("inventory:transfer");

  const canReceiveTransferForBranch = (toBranchId: string) =>
    canReceiveWarehouseTransfer &&
    (canViewAllBranches || !userBranchId || toBranchId === userBranchId);

  const handleReceiveWarehouseTransfer = async (transferId: string) => {
    const result = await receiveWarehouseTransferAtBranch(transferId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Transfer marked as received");
    router.refresh();
  };
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>(() =>
    !authLoading && !canViewAllBranches && userBranchId ? userBranchId : "all"
  );

  const reconcileBranchId = useMemo(() => {
    if (!canViewAllBranches) return userBranchId;
    if (branchFilter !== "all") return branchFilter;
    return userBranchId || branches[0]?.id || null;
  }, [canViewAllBranches, branchFilter, userBranchId, branches]);
  
  // Pagination state (shared page size across tabs)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageWarehouse, setPageWarehouse] = useState(1);
  const [pageOutbound, setPageOutbound] = useState(1);
  const [pageTransfers, setPageTransfers] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageToWarehouse, setPageToWarehouse] = useState(1);
  const [warehouseBranchFilter, setWarehouseBranchFilter] = useState("all");
  const [warehouseStatusFilter, setWarehouseStatusFilter] = useState("all");
  const [outboundBranchFilter, setOutboundBranchFilter] = useState("all");
  const [transferBranchFilter, setTransferBranchFilter] = useState("all");
  const [transferStatusFilter, setTransferStatusFilter] = useState("all");
  const [returnStatusFilter, setReturnStatusFilter] = useState<string>("all");
  const [returnWarehouseFilter, setReturnWarehouseFilter] = useState<string>("all");
  const [returnBranchFilter, setReturnBranchFilter] = useState("all");

  // Set currency based on selected branch filter
  const selectedBranchId = branchFilter !== "all" ? branchFilter : null;
  useBranchCurrency(selectedBranchId, branches);
  
  // Form states
  const [isOutboundOpen, setIsOutboundOpen] = useState(false);
  const [isWasteOpen, setIsWasteOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isBranchReturnOpen, setIsBranchReturnOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [reconcileSubmittedToday, setReconcileSubmittedToday] = useState(false);

  useEffect(() => {
    if (!canReconcile || !reconcileBranchId) {
      setReconcileSubmittedToday(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await getReconciliationStatusForDate(reconcileBranchId);
      if (!cancelled && result.success && result.data) {
        setReconcileSubmittedToday(result.data.submitted);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canReconcile, reconcileBranchId, isReconcileOpen]);

  const resetAllPages = () => {
    setCurrentPage(1);
    setPageWarehouse(1);
    setPageOutbound(1);
    setPageTransfers(1);
    setPageToWarehouse(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    resetAllPages();
  };

  const visibleBranchReturns = useMemo(() => {
    let list = branchReturns;
    if (!canViewAllBranches && userBranchId) {
      list = list.filter((r) => r.fromBranchId === userBranchId);
    } else if (returnBranchFilter !== "all") {
      list = list.filter((r) => r.fromBranchId === returnBranchFilter);
    }
    if (returnWarehouseFilter !== "all") {
      list = list.filter((r) => r.toWarehouseId === returnWarehouseFilter);
    }
    if (returnStatusFilter !== "all") {
      list = list.filter((r) => r.status === returnStatusFilter);
    }
    return list;
  }, [
    branchReturns,
    canViewAllBranches,
    userBranchId,
    returnBranchFilter,
    returnWarehouseFilter,
    returnStatusFilter,
  ]);

  const paginatedBranchReturns = useMemo(() => {
    const start = (pageToWarehouse - 1) * pageSize;
    return visibleBranchReturns.slice(start, start + pageSize);
  }, [visibleBranchReturns, pageToWarehouse, pageSize]);

  const totalPagesToWarehouse = Math.max(
    1,
    Math.ceil(visibleBranchReturns.length / pageSize) || 1,
  );

  const returnStatusOptions = useMemo(() => {
    const statuses = new Set(branchReturns.map((r) => r.status));
    return Array.from(statuses).sort();
  }, [branchReturns]);

  const warehouseStatusOptions = useMemo(
    () => Array.from(new Set(warehouseTransfers.map((t) => t.status))).sort(),
    [warehouseTransfers],
  );

  const transferStatusOptions = useMemo(
    () => Array.from(new Set(transferRecords.map((t) => t.status))).sort(),
    [transferRecords],
  );

  const filteredWarehouseTransfers = useMemo(() => {
    let list = warehouseTransfers;
    if (!canViewAllBranches && userBranchId) {
      list = list.filter((t) => t.toBranchId === userBranchId);
    } else if (warehouseBranchFilter !== "all") {
      list = list.filter((t) => t.toBranchId === warehouseBranchFilter);
    }
    if (warehouseStatusFilter !== "all") {
      list = list.filter((t) => t.status === warehouseStatusFilter);
    }
    return list;
  }, [
    warehouseTransfers,
    canViewAllBranches,
    userBranchId,
    warehouseBranchFilter,
    warehouseStatusFilter,
  ]);

  const filteredOutboundRecords = useMemo(() => {
    let list = outboundRecords;
    if (!canViewAllBranches && userBranchId) {
      const branchName = branches.find((b) => b.id === userBranchId)?.name;
      list = list.filter(
        (r) => r.branchId === userBranchId || r.branch?.name === branchName,
      );
    } else if (outboundBranchFilter !== "all") {
      const branchName = branches.find((b) => b.id === outboundBranchFilter)?.name;
      list = list.filter(
        (r) =>
          r.branchId === outboundBranchFilter || r.branch?.name === branchName,
      );
    }
    return list;
  }, [outboundRecords, canViewAllBranches, userBranchId, outboundBranchFilter, branches]);

  const filteredTransferRecords = useMemo(() => {
    let list = transferRecords;
    if (!canViewAllBranches && userBranchId) {
      list = list.filter(
        (r) =>
          r.fromBranchId === userBranchId || r.toBranchId === userBranchId,
      );
    } else if (transferBranchFilter !== "all") {
      list = list.filter(
        (r) =>
          r.fromBranchId === transferBranchFilter ||
          r.toBranchId === transferBranchFilter,
      );
    }
    if (transferStatusFilter !== "all") {
      list = list.filter((r) => r.status === transferStatusFilter);
    }
    return list;
  }, [
    transferRecords,
    canViewAllBranches,
    userBranchId,
    transferBranchFilter,
    transferStatusFilter,
  ]);

  const paginatedWarehouseTransfers = useMemo(() => {
    const start = (pageWarehouse - 1) * pageSize;
    return filteredWarehouseTransfers.slice(start, start + pageSize);
  }, [filteredWarehouseTransfers, pageWarehouse, pageSize]);

  const paginatedOutboundRecords = useMemo(() => {
    const start = (pageOutbound - 1) * pageSize;
    return filteredOutboundRecords.slice(start, start + pageSize);
  }, [filteredOutboundRecords, pageOutbound, pageSize]);

  const paginatedTransferRecords = useMemo(() => {
    const start = (pageTransfers - 1) * pageSize;
    return filteredTransferRecords.slice(start, start + pageSize);
  }, [filteredTransferRecords, pageTransfers, pageSize]);

  const totalPagesWarehouse = Math.max(
    1,
    Math.ceil(filteredWarehouseTransfers.length / pageSize) || 1,
  );
  const totalPagesOutbound = Math.max(
    1,
    Math.ceil(filteredOutboundRecords.length / pageSize) || 1,
  );
  const totalPagesTransfers = Math.max(
    1,
    Math.ceil(filteredTransferRecords.length / pageSize) || 1,
  );

  useEffect(() => {
    resetAllPages();
  }, [
    branchFilter,
    statusFilter,
    categoryFilter,
    searchQuery,
    warehouseBranchFilter,
    warehouseStatusFilter,
    outboundBranchFilter,
    transferBranchFilter,
    transferStatusFilter,
    returnStatusFilter,
    returnWarehouseFilter,
    returnBranchFilter,
    branchReturns.length,
  ]);

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      const effectiveBranch =
        !canViewAllBranches && userBranchId ? userBranchId : branchFilter;
      const matchesBranch =
        effectiveBranch === "all" || item.branchId === effectiveBranch;
      return matchesSearch && matchesStatus && matchesCategory && matchesBranch;
    });

    return filtered;
  }, [
    items,
    searchQuery,
    statusFilter,
    categoryFilter,
    branchFilter,
    canViewAllBranches,
    userBranchId,
  ]);

  // Paginated items
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize) || 1);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (pageToWarehouse > totalPagesToWarehouse) setPageToWarehouse(totalPagesToWarehouse);
    if (pageWarehouse > totalPagesWarehouse) setPageWarehouse(totalPagesWarehouse);
    if (pageOutbound > totalPagesOutbound) setPageOutbound(totalPagesOutbound);
    if (pageTransfers > totalPagesTransfers) setPageTransfers(totalPagesTransfers);
  }, [
    currentPage,
    totalPages,
    pageToWarehouse,
    totalPagesToWarehouse,
    pageWarehouse,
    totalPagesWarehouse,
    pageOutbound,
    totalPagesOutbound,
    pageTransfers,
    totalPagesTransfers,
  ]);

  const categoryNames =
    categories.length > 0
      ? categories.map((c) => c.name)
      : [...new Set(items.map((i) => i.category))];

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
            <TabsTrigger value="warehouse" className="text-xs h-7">From Warehouse</TabsTrigger>
            <TabsTrigger value="outbound" className="text-xs h-7">Outbound</TabsTrigger>
            <TabsTrigger value="transfers" className="text-xs h-7">Branch Transfers</TabsTrigger>
            <TabsTrigger value="to-warehouse" className="text-xs h-7">To Warehouse</TabsTrigger>
            <TabsTrigger value="reconciliations" className="text-xs h-7">Reconciliations</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            {canReconcile && reconcileBranchId && (
              <Button
                size="sm"
                className="h-8"
                variant={reconcileSubmittedToday ? "outline" : "default"}
                onClick={() => setIsReconcileOpen(true)}
              >
                <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                {reconcileSubmittedToday ? "View reconciliation" : "Reconcile stock"}
              </Button>
            )}
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
            {/* <Button size="sm" className="h-8" onClick={() => setIsAddItemOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Item
            </Button> */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  Actions
                  <MoreHorizontal className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsOutboundOpen(true)}>
                  <ArrowUpFromLine className="mr-2 h-4 w-4" />
                  Record Outbound
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsWasteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Record Loss
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsTransferOpen(true)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Transfer to Branch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsBranchReturnOpen(true)}>
                  <ArrowUpFromLine className="mr-2 h-4 w-4" />
                  Return to Warehouse
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <TabsContent value="all" className="mt-6">
          <Card className="glass">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <CardTitle>All inventory items</CardTitle>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <div className="relative w-full sm:w-44">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-full sm:w-[130px] text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="low">Low stock</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="overstock">Overstock</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={categoryFilter}
                  onValueChange={(v) => {
                    setCategoryFilter(v);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-full sm:w-[140px] text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categoryNames.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canViewAllBranches && (
                  <Select
                    value={branchFilter}
                    onValueChange={(v) => {
                      setBranchFilter(v);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-full sm:w-[140px] text-xs">
                      <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All branches</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
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
                          description="Try adjusting your filters. Branch stock is added via warehouse transfers."
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
                              / {item.maxStock > 0 ? item.maxStock : (item.minStock * 3 || 100)}
                            </span>
                          </div>
                          <Progress
                            value={getStockPercentage(
                              item.currentStock,
                              item.minStock,
                              item.maxStock > 0 ? item.maxStock : (item.minStock * 3 || 100)
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
                onPageSizeChange={handlePageSizeChange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warehouse" className="mt-6">
          <Card className="glass">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Warehouse to branch transfers</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Incoming stock from warehouses to branches.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canViewAllBranches && (
                  <Select
                    value={warehouseBranchFilter}
                    onValueChange={(v) => {
                      setWarehouseBranchFilter(v);
                      setPageWarehouse(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All branches</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select
                  value={warehouseStatusFilter}
                  onValueChange={(v) => {
                    setWarehouseStatusFilter(v);
                    setPageWarehouse(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {warehouseStatusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredWarehouseTransfers.length > 0 ? (
                <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedWarehouseTransfers.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.itemName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{record.itemSku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{record.warehouseName}</TableCell>
                        <TableCell>{record.toBranchName}</TableCell>
                        <TableCell className="text-right">{record.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(record.totalCost)}</TableCell>
                        <TableCell>
                          <Badge className={TRANSFER_STATUS_COLORS[record.status] || ""}>{record.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(record.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</TableCell>
                        <TableCell>
                          {RECEIVABLE_WAREHOUSE_TRANSFER_STATUSES.has(record.status) &&
                            canReceiveTransferForBranch(record.toBranchId) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleReceiveWarehouseTransfer(record.id)}
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Mark received
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  currentPage={pageWarehouse}
                  totalPages={totalPagesWarehouse}
                  totalItems={filteredWarehouseTransfers.length}
                  pageSize={pageSize}
                  onPageChange={setPageWarehouse}
                  onPageSizeChange={handlePageSizeChange}
                />
                </>
              ) : (
                <div className="p-6">
                  <p className="text-muted-foreground">
                    No warehouse transfers found. Stock is received from warehouse transfers managed in the Warehouse section.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outbound" className="mt-6">
          <Card className="glass">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Recent outbound stock</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Sales, waste, and adjustments that reduced branch stock.
                </p>
              </div>
              {canViewAllBranches && (
                <Select
                  value={outboundBranchFilter}
                  onValueChange={(v) => {
                    setOutboundBranchFilter(v);
                    setPageOutbound(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {filteredOutboundRecords.length > 0 ? (
                <>
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
                    {paginatedOutboundRecords.map((record) => (
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
                        <TableCell>{new Date(record.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  currentPage={pageOutbound}
                  totalPages={totalPagesOutbound}
                  totalItems={filteredOutboundRecords.length}
                  pageSize={pageSize}
                  onPageChange={setPageOutbound}
                  onPageSizeChange={handlePageSizeChange}
                />
                </>
              ) : (
                <p className="p-6 text-muted-foreground">
                  No outbound stock records found. Records will appear here when items are sold, wasted, or adjusted.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="mt-6">
          <Card className="glass">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Branch-to-branch transfers</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Stock moved between branches.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canViewAllBranches && (
                  <Select
                    value={transferBranchFilter}
                    onValueChange={(v) => {
                      setTransferBranchFilter(v);
                      setPageTransfers(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All branches</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select
                  value={transferStatusFilter}
                  onValueChange={(v) => {
                    setTransferStatusFilter(v);
                    setPageTransfers(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {transferStatusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredTransferRecords.length > 0 ? (
                <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransferRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.item.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{record.item.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{record.fromBranch.name}</TableCell>
                        <TableCell>{record.toBranch.name}</TableCell>
                        <TableCell className="text-right">{record.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(record.totalCost)}</TableCell>
                        <TableCell>
                          <Badge className={TRANSFER_STATUS_COLORS[record.status] || ""}>{record.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(record.transferDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</TableCell>
                        <TableCell>
                          {(record.status === "PENDING" || record.status === "IN_TRANSIT") && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {record.status === "PENDING" && (
                                  <DropdownMenuItem onClick={async () => {
                                    const res = await updateBranchTransferStatus(record.id, "IN_TRANSIT" as TransferStatus);
                                    if (res.success) toast.success("Transfer approved");
                                    else toast.error(res.error || "Failed");
                                  }}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />Approve
                                  </DropdownMenuItem>
                                )}
                                {record.status === "IN_TRANSIT" && (
                                  <DropdownMenuItem onClick={async () => {
                                    const res = await updateBranchTransferStatus(record.id, "COMPLETED" as TransferStatus);
                                    if (res.success) toast.success("Transfer completed");
                                    else toast.error(res.error || "Failed");
                                  }}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />Mark Received
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="text-red-600" onClick={async () => {
                                  const res = await updateBranchTransferStatus(record.id, "CANCELLED" as TransferStatus);
                                  if (res.success) toast.success("Transfer cancelled");
                                  else toast.error(res.error || "Failed");
                                }}>
                                  <XCircle className="mr-2 h-4 w-4" />Cancel
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  currentPage={pageTransfers}
                  totalPages={totalPagesTransfers}
                  totalItems={filteredTransferRecords.length}
                  pageSize={pageSize}
                  onPageChange={setPageTransfers}
                  onPageSizeChange={handlePageSizeChange}
                />
                </>
              ) : (
                <div className="p-6">
                  <p className="text-muted-foreground">
                    No transfer records found. Use the Transfer Stock button to initiate inter-branch transfers.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="to-warehouse" className="mt-6">
          <Card className="glass">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Returns to warehouse</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Branch stock sent back to warehouses. Pending returns are received or
                  rejected in the Warehouse section.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canViewAllBranches && (
                  <Select
                    value={returnBranchFilter}
                    onValueChange={(v) => {
                      setReturnBranchFilter(v);
                      setPageToWarehouse(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All branches</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {warehouses.length > 1 && canViewAllBranches && (
                  <Select
                    value={returnWarehouseFilter}
                    onValueChange={(v) => {
                      setReturnWarehouseFilter(v);
                      setPageToWarehouse(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[160px] text-xs">
                      <SelectValue placeholder="Warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All warehouses</SelectItem>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select
                  value={returnStatusFilter}
                  onValueChange={(v) => {
                    setReturnStatusFilter(v);
                    setPageToWarehouse(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {returnStatusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {visibleBranchReturns.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>From branch</TableHead>
                        <TableHead>To warehouse</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedBranchReturns.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDisplayDate(record.transferDate)}
                          </TableCell>
                          <TableCell>{record.branchName}</TableCell>
                          <TableCell>{record.warehouseName}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{record.itemName}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {record.itemSku}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {record.quantity} {record.itemUnit}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(record.totalCost)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                TRANSFER_STATUS_COLORS[record.status] || ""
                              }
                            >
                              {record.status.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                            {record.notes || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    currentPage={pageToWarehouse}
                    totalPages={totalPagesToWarehouse}
                    totalItems={visibleBranchReturns.length}
                    pageSize={pageSize}
                    onPageChange={setPageToWarehouse}
                    onPageSizeChange={handlePageSizeChange}
                  />
                </>
              ) : (
                <div className="p-6">
                  <EmptyState
                    icon={
                      <ArrowUpFromLine className="h-8 w-8 text-muted-foreground" />
                    }
                    title="No returns to warehouse"
                    description={
                      canViewAllBranches
                        ? "Branch returns will appear here when staff use Return to Warehouse from the actions menu."
                        : "Create a return with Return to Warehouse in the actions menu, or check back after submitting one."
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliations" className="mt-6">
          <ReconciliationHistoryPanel
            branches={branches}
            branchId={reconcileBranchId}
            canViewAllBranches={canViewAllBranches}
          />
        </TabsContent>
      </Tabs>

      <StockReconciliationDialog
        open={isReconcileOpen}
        onOpenChange={setIsReconcileOpen}
        branches={branches}
        branchId={reconcileBranchId}
        canViewAllBranches={canViewAllBranches}
      />

      {/* Forms */}
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
      <BranchReturnToWarehouseDialog
        open={isBranchReturnOpen}
        onOpenChange={setIsBranchReturnOpen}
        branches={branches}
        warehouses={warehouses}
        items={items}
        onCreated={() => router.refresh()}
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
