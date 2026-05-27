"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { getSupplierSupplyDetails } from "@/lib/actions/inventory";
import { formatEnumLabel } from "./supplier-form-options";

interface SupplierDetailsPanelProps {
  supplierId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SupplierSummary = {
  id: string;
  name: string;
  code: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  leadTime: string | null;
  paymentMethod: string | null;
  tags: string[];
  isActive: boolean;
  lifetimePayments: number;
  deliveriesCount: number;
  lastSuppliedAt: Date | null;
};

type SupplyRecord = {
  id: string;
  warehouseName: string;
  itemName: string;
  itemSku: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  invoiceNumber: string | null;
  deliveryDate: string;
};

export function SupplierDetailsPanel({
  supplierId,
  open,
  onOpenChange,
}: SupplierDetailsPanelProps) {
  const { formatCurrency } = useCurrency();
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<SupplierSummary | null>(null);
  const [records, setRecords] = useState<SupplyRecord[]>([]);
  const [search, setSearch] = useState("");
  const [warehouseId, setWarehouseId] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [warehouseOptions, setWarehouseOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    if (!open || !supplierId) return;
    startTransition(async () => {
      const result = await getSupplierSupplyDetails(supplierId, {
        search: search || undefined,
        warehouseId: warehouseId === "all" ? undefined : warehouseId,
        from: fromDate || undefined,
        to: toDate || undefined,
        page,
        pageSize,
      });
      if (!result.success || !result.data) return;
      setSummary({
        ...result.data.supplier,
        lastSuppliedAt: result.data.supplier.lastSuppliedAt
          ? new Date(result.data.supplier.lastSuppliedAt)
          : null,
      });
      setRecords(result.data.records);
      setTotalPages(result.data.pagination.totalPages);
      const byWarehouse = new Map<string, string>();
      result.data.records.forEach((r) => {
        byWarehouse.set(r.warehouseId, r.warehouseName);
      });
      setWarehouseOptions(
        Array.from(byWarehouse.entries()).map(([id, name]) => ({ id, name })),
      );
    });
  }, [open, supplierId, search, warehouseId, fromDate, toDate, page, pageSize]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setWarehouseId("all");
      setFromDate("");
      setToDate("");
      setPage(1);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Supplier Details</DialogTitle>
          <DialogDescription>
            Itemized supplies delivered by this supplier.
          </DialogDescription>
        </DialogHeader>

        {summary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Supplier</p><p className="font-semibold">{summary.name}</p><p className="text-xs text-muted-foreground">{summary.code}</p></CardContent></Card>
              <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Lifetime Value</p><p className="font-semibold">{formatCurrency(summary.lifetimePayments)}</p></CardContent></Card>
              <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Deliveries</p><p className="font-semibold">{summary.deliveriesCount}</p></CardContent></Card>
              <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Last Supplied</p><p className="font-semibold">{summary.lastSuppliedAt ? summary.lastSuppliedAt.toLocaleDateString() : "—"}</p></CardContent></Card>
            </div>

            <div className="grid gap-2 md:grid-cols-5">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  placeholder="Search item SKU/name or invoice"
                  className="pl-9"
                />
              </div>
              <Select
                value={warehouseId}
                onValueChange={(v) => {
                  setPage(1);
                  setWarehouseId(v);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Warehouse" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All warehouses</SelectItem>
                  {warehouseOptions.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setPage(1);
                  setFromDate(e.target.value);
                }}
              />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setPage(1);
                  setToDate(e.target.value);
                }}
              />
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead>Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No supplied items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{new Date(r.deliveryDate).toLocaleDateString()}</TableCell>
                        <TableCell>{r.warehouseName}</TableCell>
                        <TableCell className="font-medium">{r.itemName}</TableCell>
                        <TableCell>{r.itemSku}</TableCell>
                        <TableCell className="text-right">
                          {r.quantity.toLocaleString()} {formatEnumLabel(r.unit)}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(r.unitCost)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(r.totalCost)}</TableCell>
                        <TableCell>{r.invoiceNumber || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPage(1);
                    setPageSize(Number(v));
                  }}
                >
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || isPending}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Badge variant="outline">Page {page} of {totalPages}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages || isPending}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
