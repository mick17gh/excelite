"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getPendingDispatchApprovals,
  approveCommissaryDispatch,
} from "@/lib/actions/stock-transfers";
import { updateTransferStatus } from "@/lib/actions/warehouse";
import { TablePagination } from "@/components/ui/table-pagination";

interface DispatchTransfer {
  id: string;
  quantity: number;
  status: string;
  warehouse: { id: string; name: string; warehouseType: string };
  warehouseItem: { name: string; sku: string; unit: string };
  toBranch: { name: string; code: string };
}

interface WarehouseOption {
  id: string;
  name: string;
}

interface DispatchApprovalPanelProps {
  warehouses: WarehouseOption[];
  selectedWarehouse: string;
  onWarehouseChange: (value: string) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function DispatchApprovalPanel({
  warehouses,
  selectedWarehouse,
  onWarehouseChange,
  pageSize,
  onPageSizeChange,
  currentPage,
  onPageChange,
}: DispatchApprovalPanelProps) {
  const router = useRouter();
  const [items, setItems] = useState<DispatchTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getPendingDispatchApprovals();
    setItems((res.data as DispatchTransfer[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id: string) => {
    const res = await approveCommissaryDispatch(id);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Dispatch approved — mark shipped when ready");
      load();
      router.refresh();
    }
  };

  const handleComplete = async (id: string) => {
    const res = await updateTransferStatus(id, "COMPLETED");
    if (res.error) toast.error(res.error);
    else {
      toast.success("Dispatch completed — branch stock updated");
      load();
      router.refresh();
    }
  };

  const filteredItems = useMemo(() => {
    if (selectedWarehouse === "all") return items;
    return items.filter((t) => t.warehouse.id === selectedWarehouse);
  }, [items, selectedWarehouse]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize) || 1);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) onPageChange(totalPages);
  }, [currentPage, totalPages, onPageChange]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="chart-card rounded-xl">
      <CardHeader className="py-3 px-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Commissary dispatch queue</CardTitle>
            <CardDescription className="text-xs">
              Approve requests from bulk commissary dispatch, then mark shipped to deduct commissary
              stock and add branch inventory.
            </CardDescription>
          </div>
          {warehouses.length > 1 && (
            <Select value={selectedWarehouse} onValueChange={onWarehouseChange}>
              <SelectTrigger className="w-full sm:w-48 h-9 shrink-0">
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
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-4 pb-4 space-y-3">
        {filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No dispatches awaiting action</p>
        ) : (
          paginatedItems.map((t) => (
            <div
              key={t.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border rounded-lg p-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {t.warehouseItem.name} ({t.quantity} {t.warehouseItem.unit})
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.warehouse.name} → {t.toBranch.name} ({t.toBranch.code})
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <Badge variant="outline">{t.status.replace(/_/g, " ")}</Badge>
                {t.status === "AWAITING_WAREHOUSE_APPROVAL" && (
                  <Button size="sm" onClick={() => handleApprove(t.id)}>
                    Approve
                  </Button>
                )}
                {t.status === "APPROVED" && (
                  <Button size="sm" variant="secondary" onClick={() => handleComplete(t.id)}>
                    Mark shipped
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
        </div>
        {filteredItems.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredItems.length}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        )}
      </CardContent>
    </Card>
  );
}
