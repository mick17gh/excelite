"use client";

import { useState, useMemo, useEffect } from "react";
import { TransferStatus } from "@/lib/generated/prisma/client";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Warehouse as WarehouseIcon,
  Package,
  ArrowRightLeft,
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  CheckCircle2,
  XCircle,
  TruckIcon,
  Trash2,
  Upload,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { updateTransferStatus } from "@/lib/actions/warehouse";
import { updateBranchWarehouseTransferStatus } from "@/lib/actions/stock-transfers";
import type { Role } from "@/lib/generated/prisma/client";
import { canMutateWarehouseOps, hasPermission } from "@/lib/permissions";
import {
  CreateWarehouseDialog,
  EditWarehouseDialog,
  CreateWarehouseItemDialog,
  EditWarehouseItemDialog,
  warehouseTypeLabel,
  itemStageLabel,
  type WarehouseFormData,
  type WarehouseItemFormData,
  CreateTransferDialog,
  BulkTransferToBranchDialog,
  BulkTransferToWarehouseDialog,
  BulkCommissaryDispatchDialog,
} from "./warehouse-forms";
import { DispatchApprovalPanel } from "./dispatch-approval-panel";
import { MaterialIssuesPanel, type MaterialTransferRow } from "./material-issues-panel";
import { useRouter } from "next/navigation";
import { CommissaryProductionPanel } from "@/components/commissary/commissary-production-panel";
import { SupplierReceivingDialog, WastageDialog } from "./warehouse-dialogs";
import { WarehouseImportDialog } from "./warehouse-import";
import { useCurrency } from "@/contexts/currency-context";
import { TablePagination } from "@/components/ui/table-pagination";
import { formatDisplayDate } from "@/lib/utils/date-display";

interface WarehouseData {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  organizationId: string;
  warehouseType?: string;
  isActive: boolean;
  itemCount: number;
  transferCount: number;
  createdAt: string;
}

interface WarehouseItem {
  id: string;
  warehouseId: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  unitCost: number;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  itemStage?: "RAW" | "PROCESSED" | "BRANCH_READY";
  requiresCommissaryProcessing?: boolean;
  allowDirectToBranch?: boolean;
  isActive: boolean;
  createdAt: string;
}

interface Transfer {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseItemId: string;
  itemName: string;
  itemSku: string;
  toBranchId: string;
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

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface WarehouseStats {
  totalWarehouses: number;
  totalItems: number;
  pendingTransfers: number;
}

interface InboundRecord {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseItemId: string;
  itemName: string;
  itemSku: string;
  itemUnit: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  invoiceNumber: string | null;
  notes: string | null;
  receivedBy: string | null;
  deliveryDate: string;
  createdAt: string;
}

interface WastageRecord {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseItemId: string;
  itemName: string;
  itemSku: string;
  itemUnit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  reason: string | null;
  notes: string | null;
  recordedBy: string | null;
  wasteDate: string;
  createdAt: string;
}

interface BranchReturnRow {
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

interface WarehouseContentProps {
  warehouses: WarehouseData[];
  items: WarehouseItem[];
  transfers: Transfer[];
  materialTransfers: MaterialTransferRow[];
  branchReturns: BranchReturnRow[];
  branches: Branch[];
  stats: WarehouseStats;
  inboundRecords: InboundRecord[];
  wastageRecords: WastageRecord[];
  userRole: Role;
  assignedWarehouseId: string | null;
}

/** Stable tab labels — single source of truth to avoid SSR/client text drift. */
const WAREHOUSE_TABS = [
  { value: "warehouses", label: "Warehouses" },
  { value: "inventory", label: "Inventory" },
  { value: "transfers", label: "Branch transfers" },
  { value: "branch-returns", label: "Branch returns" },
  { value: "material", label: "Material issues" },
  { value: "approvals", label: "Approvals" },
  { value: "production", label: "Production" },
  { value: "receiving", label: "Supplier Receiving" },
  { value: "wastage", label: "Wastage" },
] as const;

function visibleWarehouseTabs(role: Role) {
  return WAREHOUSE_TABS.filter((tab) => {
    if (tab.value === "production") return hasPermission(role, "commissary:production");
    if (tab.value === "receiving") return role !== "COMMISSARY_STAFF";
    return true;
  });
}

const ITEM_STAGE_STYLES: Record<string, string> = {
  RAW: "border-slate-300 text-slate-700 dark:text-slate-400",
  PROCESSED: "border-blue-300 text-blue-700 dark:text-blue-400",
  BRANCH_READY: "border-violet-300 text-violet-700 dark:text-violet-400",
};

const TRANSFER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  AWAITING_WAREHOUSE_APPROVAL: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  APPROVED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  IN_TRANSIT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function WarehouseContent({
  warehouses,
  items,
  transfers,
  materialTransfers,
  branchReturns,
  branches,
  stats,
  inboundRecords,
  wastageRecords,
  userRole,
  assignedWarehouseId,
}: WarehouseContentProps) {
  const router = useRouter();
  const canMutate = canMutateWarehouseOps(userRole);
  const canCreateWarehouse = canMutate && hasPermission(userRole, "warehouse:create");
  const canTransfer = canMutate && hasPermission(userRole, "warehouse:transfer");
  const canApproveDispatch =
    canMutate && hasPermission(userRole, "warehouse:approve_dispatch");
  const canLogWastage = canMutate && hasPermission(userRole, "warehouse:edit");
  const tabs = useMemo(() => visibleWarehouseTabs(userRole), [userRole]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [showCreateWarehouse, setShowCreateWarehouse] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseFormData | null>(null);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseItemFormData | null>(null);
  const [showCreateTransfer, setShowCreateTransfer] = useState(false);
  const [showBulkTransfer, setShowBulkTransfer] = useState(false);
  const [showBulkWhTransfer, setShowBulkWhTransfer] = useState(false);
  const [showBulkCommissaryDispatch, setShowBulkCommissaryDispatch] = useState(false);
  const [showSupplierReceiving, setShowSupplierReceiving] = useState(false);
  const [showWastage, setShowWastage] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedWarehouseForImport, setSelectedWarehouseForImport] = useState<{id: string, name: string} | null>(null);
  const { formatCurrency } = useCurrency();

  const [pageSize, setPageSize] = useState(10);
  const [pageWarehouses, setPageWarehouses] = useState(1);
  const [pageInventory, setPageInventory] = useState(1);
  const [pageTransfers, setPageTransfers] = useState(1);
  const [pageBranchReturns, setPageBranchReturns] = useState(1);
  const [pageMaterial, setPageMaterial] = useState(1);
  const [processingBranchReturnId, setProcessingBranchReturnId] = useState<string | null>(null);
  const [pageApprovals, setPageApprovals] = useState(1);
  const [pageReceiving, setPageReceiving] = useState(1);
  const [pageWastage, setPageWastage] = useState(1);
  const [tabsReady, setTabsReady] = useState(false);

  useEffect(() => {
    setTabsReady(true);
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesWarehouse = selectedWarehouse === "all" || item.warehouseId === selectedWarehouse;
      return matchesSearch && matchesWarehouse;
    });
  }, [items, searchQuery, selectedWarehouse]);

  const filteredTransfers = useMemo(() => {
    if (selectedWarehouse === "all") return transfers;
    return transfers.filter((t) => t.warehouseId === selectedWarehouse);
  }, [transfers, selectedWarehouse]);

  const filteredMaterialTransfers = useMemo(() => {
    if (selectedWarehouse === "all") return materialTransfers;
    return materialTransfers.filter(
      (t) =>
        t.fromWarehouseId === selectedWarehouse ||
        t.toWarehouseId === selectedWarehouse,
    );
  }, [materialTransfers, selectedWarehouse]);

  const filteredBranchReturns = useMemo(() => {
    if (selectedWarehouse === "all") return branchReturns;
    return branchReturns.filter((t) => t.toWarehouseId === selectedWarehouse);
  }, [branchReturns, selectedWarehouse]);

  const pendingBranchReturnsCount = useMemo(
    () =>
      filteredBranchReturns.filter((t) => t.status === "PENDING").length,
    [filteredBranchReturns],
  );

  const paginatedBranchReturns = useMemo(() => {
    const start = (pageBranchReturns - 1) * pageSize;
    return filteredBranchReturns.slice(start, start + pageSize);
  }, [filteredBranchReturns, pageBranchReturns, pageSize]);

  const totalPagesBranchReturns = Math.max(
    1,
    Math.ceil(filteredBranchReturns.length / pageSize) || 1,
  );

  const openMaterialCount = useMemo(
    () =>
      filteredMaterialTransfers.filter(
        (t) => t.status === "PENDING" || t.status === "IN_TRANSIT",
      ).length,
    [filteredMaterialTransfers],
  );

  useEffect(() => {
    setPageInventory(1);
  }, [searchQuery, selectedWarehouse]);

  useEffect(() => {
    setPageTransfers(1);
  }, [selectedWarehouse, transfers]);

  useEffect(() => {
    setPageBranchReturns(1);
  }, [selectedWarehouse, branchReturns]);

  useEffect(() => {
    setPageMaterial(1);
  }, [selectedWarehouse, materialTransfers]);

  useEffect(() => {
    setPageApprovals(1);
  }, [selectedWarehouse]);

  useEffect(() => {
    setPageWarehouses(1);
    setPageInventory(1);
    setPageTransfers(1);
    setPageBranchReturns(1);
    setPageMaterial(1);
    setPageApprovals(1);
    setPageReceiving(1);
    setPageWastage(1);
  }, [pageSize]);

  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b.name])), [branches]);

  const commissaryWarehouse = useMemo(
    () => warehouses.find((w) => w.warehouseType === "COMMISSARY"),
    [warehouses],
  );

  const paginatedWarehouses = useMemo(() => {
    const start = (pageWarehouses - 1) * pageSize;
    return warehouses.slice(start, start + pageSize);
  }, [warehouses, pageWarehouses, pageSize]);

  const paginatedInventory = useMemo(() => {
    const start = (pageInventory - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, pageInventory, pageSize]);

  const paginatedTransfers = useMemo(() => {
    const start = (pageTransfers - 1) * pageSize;
    return filteredTransfers.slice(start, start + pageSize);
  }, [filteredTransfers, pageTransfers, pageSize]);

  const paginatedMaterialTransfers = useMemo(() => {
    const start = (pageMaterial - 1) * pageSize;
    return filteredMaterialTransfers.slice(start, start + pageSize);
  }, [filteredMaterialTransfers, pageMaterial, pageSize]);

  const paginatedInbound = useMemo(() => {
    const start = (pageReceiving - 1) * pageSize;
    return inboundRecords.slice(start, start + pageSize);
  }, [inboundRecords, pageReceiving, pageSize]);

  const paginatedWastage = useMemo(() => {
    const start = (pageWastage - 1) * pageSize;
    return wastageRecords.slice(start, start + pageSize);
  }, [wastageRecords, pageWastage, pageSize]);

  const totalPagesWh = Math.max(1, Math.ceil(warehouses.length / pageSize) || 1);
  const totalPagesInv = Math.max(1, Math.ceil(filteredItems.length / pageSize) || 1);
  const totalPagesXfer = Math.max(1, Math.ceil(filteredTransfers.length / pageSize) || 1);
  const totalPagesMaterial = Math.max(
    1,
    Math.ceil(filteredMaterialTransfers.length / pageSize) || 1,
  );
  const totalPagesRecv = Math.max(1, Math.ceil(inboundRecords.length / pageSize) || 1);
  const totalPagesWaste = Math.max(1, Math.ceil(wastageRecords.length / pageSize) || 1);

  useEffect(() => {
    if (pageWarehouses > totalPagesWh) setPageWarehouses(totalPagesWh);
  }, [pageWarehouses, totalPagesWh]);
  useEffect(() => {
    if (pageInventory > totalPagesInv) setPageInventory(totalPagesInv);
  }, [pageInventory, totalPagesInv]);
  useEffect(() => {
    if (pageTransfers > totalPagesXfer) setPageTransfers(totalPagesXfer);
  }, [pageTransfers, totalPagesXfer]);
  useEffect(() => {
    if (pageBranchReturns > totalPagesBranchReturns) {
      setPageBranchReturns(totalPagesBranchReturns);
    }
  }, [pageBranchReturns, totalPagesBranchReturns]);
  useEffect(() => {
    if (pageMaterial > totalPagesMaterial) setPageMaterial(totalPagesMaterial);
  }, [pageMaterial, totalPagesMaterial]);
  useEffect(() => {
    if (pageReceiving > totalPagesRecv) setPageReceiving(totalPagesRecv);
  }, [pageReceiving, totalPagesRecv]);
  useEffect(() => {
    if (pageWastage > totalPagesWaste) setPageWastage(totalPagesWaste);
  }, [pageWastage, totalPagesWaste]);

  const handleApproveTransfer = async (id: string) => {
    const result = await updateTransferStatus(id, "IN_TRANSIT" as TransferStatus);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Transfer approved");
      router.refresh();
    }
  };

  const handleCompleteTransfer = async (id: string) => {
    const result = await updateTransferStatus(id, "COMPLETED" as TransferStatus);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Transfer completed");
      router.refresh();
    }
  };

  const handleCancelTransfer = async (id: string) => {
    const result = await updateTransferStatus(id, "CANCELLED" as TransferStatus);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Transfer cancelled");
      router.refresh();
    }
  };

  const handleBranchReturnStatus = async (id: string, status: TransferStatus) => {
    setProcessingBranchReturnId(id);
    const result = await updateBranchWarehouseTransferStatus(id, status);
    setProcessingBranchReturnId(null);
    if (result.error) toast.error(result.error);
    else {
      toast.success(
        status === "COMPLETED" ? "Return received — stock updated" : "Return rejected",
      );
      router.refresh();
    }
  };

  const canActOnBranchReturn = (toWarehouseId: string) => {
    if (!canMutate) return false;
    if (
      assignedWarehouseId &&
      (userRole === "WAREHOUSE_STAFF" || userRole === "COMMISSARY_STAFF") &&
      assignedWarehouseId !== toWarehouseId
    ) {
      return false;
    }
    return true;
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-2 sm:gap-3 grid-cols-3">
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Warehouses</p>
                <p className="text-base font-bold mt-0.5">{stats.totalWarehouses}</p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <WarehouseIcon className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Total Items</p>
                <p className="text-base font-bold mt-0.5">{stats.totalItems}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
                <Package className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Pending outbound</p>
                <p className="text-base font-bold mt-0.5 text-amber-600">{stats.pendingTransfers}</p>
                {pendingBranchReturnsCount > 0 ? (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    +{pendingBranchReturnsCount} branch return
                    {pendingBranchReturnsCount === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-amber-100 dark:bg-amber-900/30">
                <ArrowRightLeft className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="warehouses" className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {tabsReady ? (
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          ) : (
            <div
              className="bg-muted text-muted-foreground inline-flex h-9 w-fit max-w-full flex-wrap items-center justify-center gap-0.5 rounded-lg p-[3px]"
              aria-hidden
            >
              {tabs.map((tab) => (
                <span
                  key={tab.value}
                  className="inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap"
                >
                  {tab.label}
                </span>
              ))}
            </div>
          )}
          {canMutate ? (
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canCreateWarehouse ? (
                    <DropdownMenuItem onClick={() => setShowCreateWarehouse(true)}>
                      <WarehouseIcon className="mr-2 h-4 w-4" />New Warehouse
                    </DropdownMenuItem>
                  ) : null}
                  {canCreateWarehouse ? (
                    <DropdownMenuItem onClick={() => setShowCreateItem(true)}>
                      <Package className="mr-2 h-4 w-4" />New Item
                    </DropdownMenuItem>
                  ) : null}
                  {canTransfer ? (
                    <DropdownMenuItem onClick={() => setShowCreateTransfer(true)}>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />Transfer to Branch
                    </DropdownMenuItem>
                  ) : null}
                  {canTransfer ? (
                    <DropdownMenuItem onClick={() => setShowBulkTransfer(true)}>
                      <Layers className="mr-2 h-4 w-4" />Bulk transfer to Branch
                    </DropdownMenuItem>
                  ) : null}
                  {canTransfer ? (
                    <DropdownMenuItem onClick={() => setShowBulkWhTransfer(true)}>
                      <Layers className="mr-2 h-4 w-4" />Bulk material issue (RAW → commissary)
                    </DropdownMenuItem>
                  ) : null}
                  {canTransfer ? (
                    <DropdownMenuItem onClick={() => setShowBulkCommissaryDispatch(true)}>
                      <Layers className="mr-2 h-4 w-4" />Bulk commissary dispatch
                    </DropdownMenuItem>
                  ) : null}
                  {canCreateWarehouse ? (
                    <DropdownMenuItem onClick={() => setShowSupplierReceiving(true)}>
                      <TruckIcon className="mr-2 h-4 w-4" />Receive from Supplier
                    </DropdownMenuItem>
                  ) : null}
                  {canLogWastage ? (
                    <DropdownMenuItem onClick={() => setShowWastage(true)}>
                      <Trash2 className="mr-2 h-4 w-4" />Log Wastage
                    </DropdownMenuItem>
                  ) : null}
                  {canCreateWarehouse ? (
                    <DropdownMenuItem
                      onClick={() => {
                        if (warehouses.length > 0) {
                          setSelectedWarehouseForImport({
                            id: warehouses[0].id,
                            name: warehouses[0].name,
                          });
                          setShowBulkImport(true);
                        } else {
                          toast.error("Please create a warehouse first");
                        }
                      }}
                    >
                      <Upload className="mr-2 h-4 w-4" />Bulk Import
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
        </div>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses">
          <Card className="rounded-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-center">Transfers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No warehouses yet</TableCell>
                    </TableRow>
                  ) : (
                    paginatedWarehouses.map((wh) => (
                      <TableRow key={wh.id}>
                        <TableCell className="font-medium">{wh.name}</TableCell>
                        <TableCell className="font-mono text-sm">{wh.code}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              wh.warehouseType === "COMMISSARY"
                                ? "border-violet-300 text-violet-700 dark:text-violet-400"
                                : "border-slate-300 text-slate-700 dark:text-slate-400"
                            }
                          >
                            {warehouseTypeLabel(wh.warehouseType)}
                          </Badge>
                        </TableCell>
                        <TableCell>{wh.city}</TableCell>
                        <TableCell className="text-center"><Badge variant="secondary">{wh.itemCount}</Badge></TableCell>
                        <TableCell className="text-center"><Badge variant="secondary">{wh.transferCount}</Badge></TableCell>
                        <TableCell>
                          <Badge className={wh.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700"}>
                            {wh.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {canCreateWarehouse ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() =>
                              setEditingWarehouse({
                                id: wh.id,
                                name: wh.name,
                                code: wh.code,
                                address: wh.address,
                                city: wh.city,
                                phone: wh.phone,
                                email: wh.email,
                                warehouseType:
                                  wh.warehouseType === "COMMISSARY" ? "COMMISSARY" : "RAW",
                                isActive: wh.isActive,
                              })
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {warehouses.length > 0 && (
                <TablePagination
                  currentPage={pageWarehouses}
                  totalPages={totalPagesWh}
                  totalItems={warehouses.length}
                  pageSize={pageSize}
                  onPageChange={setPageWarehouses}
                  onPageSizeChange={setPageSize}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            {warehouses.length > 1 && (
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Card className="rounded-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No inventory items</TableCell>
                    </TableRow>
                  ) : (
                    paginatedInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              ITEM_STAGE_STYLES[item.itemStage || "RAW"] ||
                              ITEM_STAGE_STYLES.RAW
                            }
                          >
                            {itemStageLabel(item.itemStage)}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">
                          <span className={item.currentStock <= item.minStock ? "text-red-600 font-medium" : item.currentStock <= item.reorderPoint ? "text-amber-600 font-medium" : ""}>
                            {item.currentStock.toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                        <TableCell>
                          {item.currentStock <= item.minStock ? (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Critical</Badge>
                          ) : item.currentStock <= item.reorderPoint ? (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Low</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">OK</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {canCreateWarehouse ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() =>
                              setEditingItem({
                                id: item.id,
                                warehouseId: item.warehouseId,
                                name: item.name,
                                sku: item.sku,
                                category: item.category,
                                unit: item.unit,
                                unitCost: item.unitCost,
                                currentStock: item.currentStock,
                                minStock: item.minStock,
                                reorderPoint: item.reorderPoint,
                                itemStage: item.itemStage,
                                requiresCommissaryProcessing: item.requiresCommissaryProcessing,
                                allowDirectToBranch: item.allowDirectToBranch,
                                isActive: item.isActive,
                              })
                            }
                            aria-label={`Edit ${item.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {filteredItems.length > 0 && (
                <TablePagination
                  currentPage={pageInventory}
                  totalPages={totalPagesInv}
                  totalItems={filteredItems.length}
                  pageSize={pageSize}
                  onPageChange={setPageInventory}
                  onPageSizeChange={setPageSize}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branch transfers (warehouse → branch) */}
        <TabsContent value="transfers">
          <Card className="rounded-xl">
            <CardContent className="p-0">
              <div className="flex flex-col gap-3 px-4 pt-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Warehouse to branch. Commissary dispatches awaiting approval appear in{" "}
                  <strong>Approvals</strong>; use <strong>Mark shipped</strong> there after approve.
                </p>
                {warehouses.length > 1 && (
                  <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger className="w-full sm:w-48 h-9">
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
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>To Branch</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No transfers</TableCell>
                    </TableRow>
                  ) : (
                    paginatedTransfers.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.warehouseName}</TableCell>
                        <TableCell>
                          <span className="text-sm">{t.itemName}</span>
                          <span className="block text-xs text-muted-foreground font-mono">{t.itemSku}</span>
                        </TableCell>
                        <TableCell>{branchMap.get(t.toBranchId) || t.toBranchId}</TableCell>
                        <TableCell className="text-right">{t.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(t.totalCost)}</TableCell>
                        <TableCell>
                          <Badge className={TRANSFER_STATUS_COLORS[t.status] || ""}>{t.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDisplayDate(t.transferDate)}</TableCell>
                        <TableCell>
                          {t.status === "AWAITING_WAREHOUSE_APPROVAL" ? (
                            <span className="text-xs text-muted-foreground">See Approvals</span>
                          ) : canTransfer &&
                            (t.status === "PENDING" ||
                              t.status === "IN_TRANSIT" ||
                              t.status === "APPROVED") && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {t.status === "PENDING" && (
                                  <DropdownMenuItem onClick={() => handleApproveTransfer(t.id)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />Approve
                                  </DropdownMenuItem>
                                )}
                                {(t.status === "IN_TRANSIT" || t.status === "APPROVED") && (
                                  <DropdownMenuItem onClick={() => handleCompleteTransfer(t.id)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {t.status === "APPROVED" ? "Mark shipped" : "Mark received"}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleCancelTransfer(t.id)}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />Cancel
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                currentPage={pageTransfers}
                totalPages={totalPagesXfer}
                totalItems={filteredTransfers.length}
                pageSize={pageSize}
                onPageChange={setPageTransfers}
                onPageSizeChange={setPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branch-returns">
          <Card className="rounded-xl">
            <CardContent className="p-0">
              <div className="flex flex-col gap-3 px-4 pt-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Stock returns from branches. Receive to add warehouse stock (deducts branch
                  stock). Reject to cancel with no stock movement.
                </p>
                {warehouses.length > 1 && (
                  <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger className="w-full sm:w-48 h-9">
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
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From branch</TableHead>
                    <TableHead>To warehouse</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBranchReturns.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No branch returns
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedBranchReturns.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDisplayDate(t.transferDate)}
                        </TableCell>
                        <TableCell>{t.branchName}</TableCell>
                        <TableCell>{t.warehouseName}</TableCell>
                        <TableCell>
                          <span className="text-sm">{t.itemName}</span>
                          <span className="block text-xs text-muted-foreground font-mono">
                            {t.itemSku}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {t.quantity} {t.itemUnit}
                        </TableCell>
                        <TableCell>
                          <Badge className={TRANSFER_STATUS_COLORS[t.status] || ""}>
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(t.status === "PENDING" || t.status === "IN_TRANSIT") &&
                          canActOnBranchReturn(t.toWarehouseId) ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  disabled={processingBranchReturnId === t.id}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleBranchReturnStatus(t.id, "COMPLETED" as TransferStatus)
                                  }
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Receive
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() =>
                                    handleBranchReturnStatus(t.id, "CANCELLED" as TransferStatus)
                                  }
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                currentPage={pageBranchReturns}
                totalPages={totalPagesBranchReturns}
                totalItems={filteredBranchReturns.length}
                pageSize={pageSize}
                onPageChange={setPageBranchReturns}
                onPageSizeChange={setPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="material">
          <MaterialIssuesPanel
            transfers={paginatedMaterialTransfers}
            openCount={openMaterialCount}
            canMutate={canTransfer}
            warehouses={warehouses}
            selectedWarehouse={selectedWarehouse}
            onWarehouseChange={setSelectedWarehouse}
            pagination={{
              currentPage: pageMaterial,
              totalPages: totalPagesMaterial,
              totalItems: filteredMaterialTransfers.length,
              pageSize,
              onPageChange: setPageMaterial,
              onPageSizeChange: setPageSize,
            }}
          />
        </TabsContent>

        <TabsContent value="approvals">
          <DispatchApprovalPanel
            warehouses={warehouses}
            selectedWarehouse={selectedWarehouse}
            onWarehouseChange={setSelectedWarehouse}
            canApprove={canApproveDispatch}
            canComplete={canTransfer}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            currentPage={pageApprovals}
            onPageChange={setPageApprovals}
          />
        </TabsContent>

        <TabsContent value="production">
          {commissaryWarehouse ? (
            <CommissaryProductionPanel commissaryWarehouseId={commissaryWarehouse.id} />
          ) : (
            <p className="text-sm text-muted-foreground p-4">
              Create a warehouse with type &quot;Commissary / back kitchen&quot; to use production batches.
            </p>
          )}
        </TabsContent>

        {/* Supplier Receiving Tab */}
        <TabsContent value="receiving">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>Supplier Receiving Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inboundRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        No supplier receiving records yet. Use "Receive from Supplier" to record deliveries.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedInbound.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDisplayDate(record.deliveryDate)}</TableCell>
                        <TableCell>{record.warehouseName}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.itemName}</p>
                            <p className="text-xs text-muted-foreground">{record.itemSku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{record.supplierName}</TableCell>
                        <TableCell className="text-right">{record.quantity} {record.itemUnit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(record.unitCost)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(record.totalCost)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {inboundRecords.length > 0 && (
                <TablePagination
                  currentPage={pageReceiving}
                  totalPages={totalPagesRecv}
                  totalItems={inboundRecords.length}
                  pageSize={pageSize}
                  onPageChange={setPageReceiving}
                  onPageSizeChange={setPageSize}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wastage Tab */}
        <TabsContent value="wastage">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>Wastage Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wastageRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        No wastage records yet. Use "Log Wastage" to record waste.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedWastage.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDisplayDate(record.wasteDate)}</TableCell>
                        <TableCell>{record.warehouseName}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.itemName}</p>
                            <p className="text-xs text-muted-foreground">{record.itemSku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{record.reason || "-"}</TableCell>
                        <TableCell className="text-right">{record.quantity} {record.itemUnit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(record.unitCost)}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">{formatCurrency(record.totalCost)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {wastageRecords.length > 0 && (
                <TablePagination
                  currentPage={pageWastage}
                  totalPages={totalPagesWaste}
                  totalItems={wastageRecords.length}
                  pageSize={pageSize}
                  onPageChange={setPageWastage}
                  onPageSizeChange={setPageSize}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateWarehouseDialog open={showCreateWarehouse} onOpenChange={setShowCreateWarehouse} />
      <EditWarehouseDialog
        open={editingWarehouse != null}
        onOpenChange={(open) => {
          if (!open) setEditingWarehouse(null);
        }}
        warehouse={editingWarehouse}
      />
      <CreateWarehouseItemDialog open={showCreateItem} onOpenChange={setShowCreateItem} warehouses={warehouses} />
      <EditWarehouseItemDialog
        open={editingItem != null}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
        item={editingItem}
        warehouseName={warehouses.find((w) => w.id === editingItem?.warehouseId)?.name}
      />
      <CreateTransferDialog open={showCreateTransfer} onOpenChange={setShowCreateTransfer} warehouses={warehouses} items={items} branches={branches} />
      <BulkTransferToBranchDialog open={showBulkTransfer} onOpenChange={setShowBulkTransfer} warehouses={warehouses} items={items} branches={branches} />
      <BulkTransferToWarehouseDialog open={showBulkWhTransfer} onOpenChange={setShowBulkWhTransfer} warehouses={warehouses} items={items} />
      <BulkCommissaryDispatchDialog open={showBulkCommissaryDispatch} onOpenChange={setShowBulkCommissaryDispatch} warehouses={warehouses} items={items} branches={branches} />
      <SupplierReceivingDialog open={showSupplierReceiving} onOpenChange={setShowSupplierReceiving} warehouses={warehouses} items={items} />
      <WastageDialog open={showWastage} onOpenChange={setShowWastage} warehouses={warehouses} items={items} />
      {selectedWarehouseForImport && (
        <WarehouseImportDialog 
          open={showBulkImport} 
          onOpenChange={setShowBulkImport} 
          warehouseId={selectedWarehouseForImport.id}
          warehouseName={selectedWarehouseForImport.name}
        />
      )}
    </div>
  );
}
