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
import {
  CreateWarehouseDialog,
  EditWarehouseDialog,
  CreateWarehouseItemDialog,
  EditWarehouseItemDialog,
  warehouseTypeLabel,
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

interface WarehouseContentProps {
  warehouses: WarehouseData[];
  items: WarehouseItem[];
  transfers: Transfer[];
  materialTransfers: MaterialTransferRow[];
  branches: Branch[];
  stats: WarehouseStats;
  inboundRecords: InboundRecord[];
  wastageRecords: WastageRecord[];
}

const TRANSFER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  AWAITING_WAREHOUSE_APPROVAL: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  APPROVED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  IN_TRANSIT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function WarehouseContent({ warehouses, items, transfers, materialTransfers, branches, stats, inboundRecords, wastageRecords }: WarehouseContentProps) {
  const router = useRouter();
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
  const [pageMaterial, setPageMaterial] = useState(1);
  const [pageApprovals, setPageApprovals] = useState(1);
  const [pageReceiving, setPageReceiving] = useState(1);
  const [pageWastage, setPageWastage] = useState(1);

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
    setPageMaterial(1);
  }, [selectedWarehouse, materialTransfers]);

  useEffect(() => {
    setPageApprovals(1);
  }, [selectedWarehouse]);

  useEffect(() => {
    setPageWarehouses(1);
    setPageInventory(1);
    setPageTransfers(1);
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
                <p className="text-[11px] font-medium text-muted-foreground truncate">Pending Transfers</p>
                <p className="text-base font-bold mt-0.5 text-amber-600">{stats.pendingTransfers}</p>
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
          <TabsList>
            <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="transfers">Branch transfers</TabsTrigger>
            <TabsTrigger value="material">Material issues</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="receiving">Supplier Receiving</TabsTrigger>
            <TabsTrigger value="wastage">Wastage</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowCreateWarehouse(true)}>
                  <WarehouseIcon className="mr-2 h-4 w-4" />New Warehouse
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCreateItem(true)}>
                  <Package className="mr-2 h-4 w-4" />New Item
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCreateTransfer(true)}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />Transfer to Branch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowBulkTransfer(true)}>
                  <Layers className="mr-2 h-4 w-4" />Bulk transfer to Branch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowBulkWhTransfer(true)}>
                  <Layers className="mr-2 h-4 w-4" />Bulk material issue (RAW → commissary)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowBulkCommissaryDispatch(true)}>
                  <Layers className="mr-2 h-4 w-4" />Bulk commissary dispatch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowSupplierReceiving(true)}>
                  <TruckIcon className="mr-2 h-4 w-4" />Receive from Supplier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowWastage(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />Log Wastage
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  if (warehouses.length > 0) {
                    setSelectedWarehouseForImport({ id: warehouses[0].id, name: warehouses[0].name });
                    setShowBulkImport(true);
                  } else {
                    toast.error("Please create a warehouse first");
                  }
                }}>
                  <Upload className="mr-2 h-4 w-4" />Bulk Import
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No inventory items</TableCell>
                    </TableRow>
                  ) : (
                    paginatedInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
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
                        <TableCell className="text-sm text-muted-foreground">{new Date(t.transferDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</TableCell>
                        <TableCell>
                          {t.status === "AWAITING_WAREHOUSE_APPROVAL" ? (
                            <span className="text-xs text-muted-foreground">See Approvals</span>
                          ) : (t.status === "PENDING" ||
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
              {filteredTransfers.length > 0 && (
                <TablePagination
                  currentPage={pageTransfers}
                  totalPages={totalPagesXfer}
                  totalItems={filteredTransfers.length}
                  pageSize={pageSize}
                  onPageChange={setPageTransfers}
                  onPageSizeChange={setPageSize}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="material">
          <MaterialIssuesPanel
            transfers={paginatedMaterialTransfers}
            openCount={openMaterialCount}
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
                        <TableCell>{new Date(record.deliveryDate).toLocaleDateString()}</TableCell>
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
                        <TableCell>{new Date(record.wasteDate).toLocaleDateString()}</TableCell>
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
