"use client";

import { useState, useMemo } from "react";
import { TransferStatus } from "@/lib/generated/prisma/client";
import { Card, CardContent } from "@/components/ui/card";
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
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { updateTransferStatus } from "@/lib/actions/warehouse";
import { CreateWarehouseDialog, CreateWarehouseItemDialog, CreateTransferDialog } from "./warehouse-forms";
import { useCurrency } from "@/contexts/currency-context";

interface WarehouseData {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  organizationId: string;
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

interface WarehouseContentProps {
  warehouses: WarehouseData[];
  items: WarehouseItem[];
  transfers: Transfer[];
  branches: Branch[];
  stats: WarehouseStats;
}

const TRANSFER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  IN_TRANSIT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function WarehouseContent({ warehouses, items, transfers, branches, stats }: WarehouseContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [showCreateWarehouse, setShowCreateWarehouse] = useState(false);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showCreateTransfer, setShowCreateTransfer] = useState(false);
  const { formatCurrency } = useCurrency();

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

  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b.name])), [branches]);

  const handleApproveTransfer = async (id: string) => {
    const result = await updateTransferStatus(id, "IN_TRANSIT" as TransferStatus);
    if (result.error) toast.error(result.error);
    else toast.success("Transfer approved");
  };

  const handleCompleteTransfer = async (id: string) => {
    const result = await updateTransferStatus(id, "COMPLETED" as TransferStatus);
    if (result.error) toast.error(result.error);
    else toast.success("Transfer completed");
  };

  const handleCancelTransfer = async (id: string) => {
    const result = await updateTransferStatus(id, "CANCELLED" as TransferStatus);
    if (result.error) toast.error(result.error);
    else toast.success("Transfer cancelled");
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
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowCreateWarehouse(true)}>
              <Plus className="mr-2 h-4 w-4" />Warehouse
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCreateItem(true)}>
              <Plus className="mr-2 h-4 w-4" />Item
            </Button>
            <Button size="sm" onClick={() => setShowCreateTransfer(true)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />Transfer
            </Button>
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
                    <TableHead>City</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-center">Transfers</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No warehouses yet</TableCell>
                    </TableRow>
                  ) : (
                    warehouses.map((wh) => (
                      <TableRow key={wh.id}>
                        <TableCell className="font-medium">{wh.name}</TableCell>
                        <TableCell className="font-mono text-sm">{wh.code}</TableCell>
                        <TableCell>{wh.city}</TableCell>
                        <TableCell className="text-center"><Badge variant="secondary">{wh.itemCount}</Badge></TableCell>
                        <TableCell className="text-center"><Badge variant="secondary">{wh.transferCount}</Badge></TableCell>
                        <TableCell>
                          <Badge className={wh.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700"}>
                            {wh.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No inventory items</TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfers Tab */}
        <TabsContent value="transfers">
          <Card className="rounded-xl">
            <CardContent className="p-0">
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
                    filteredTransfers.map((t) => (
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
                          {(t.status === "PENDING" || t.status === "IN_TRANSIT") && (
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
                                {t.status === "IN_TRANSIT" && (
                                  <DropdownMenuItem onClick={() => handleCompleteTransfer(t.id)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />Mark Received
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="text-red-600" onClick={() => handleCancelTransfer(t.id)}>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateWarehouseDialog open={showCreateWarehouse} onOpenChange={setShowCreateWarehouse} />
      <CreateWarehouseItemDialog open={showCreateItem} onOpenChange={setShowCreateItem} warehouses={warehouses} />
      <CreateTransferDialog open={showCreateTransfer} onOpenChange={setShowCreateTransfer} warehouses={warehouses} items={items} branches={branches} />
    </div>
  );
}
