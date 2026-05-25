"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, MoreHorizontal, XCircle } from "lucide-react";
import { toast } from "sonner";
import { updateWarehouseTransferStatus } from "@/lib/actions/stock-transfers";
import type { TransferStatus } from "@/lib/generated/prisma/client";
import { useCurrency } from "@/contexts/currency-context";
import { TablePagination } from "@/components/ui/table-pagination";
import { formatDisplayDate } from "@/lib/utils/date-display";

export interface MaterialTransferRow {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseName: string;
  itemName: string;
  itemSku: string;
  itemUnit: string;
  quantity: number;
  totalCost: number;
  status: string;
  transferDate: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  IN_TRANSIT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

interface WarehouseOption {
  id: string;
  name: string;
}

interface MaterialIssuesPanelProps {
  transfers: MaterialTransferRow[];
  openCount: number;
  canMutate?: boolean;
  warehouses?: WarehouseOption[];
  selectedWarehouse?: string;
  onWarehouseChange?: (value: string) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
}

export function MaterialIssuesPanel({
  transfers,
  openCount,
  canMutate = false,
  warehouses,
  selectedWarehouse,
  onWarehouseChange,
  pagination,
}: MaterialIssuesPanelProps) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();

  const handleStatus = async (id: string, status: TransferStatus) => {
    const res = await updateWarehouseTransferStatus(id, status);
    if (res.error) toast.error(res.error);
    else {
      toast.success(
        status === "COMPLETED"
          ? "Material received at commissary"
          : status === "IN_TRANSIT"
            ? "Transfer approved"
            : "Transfer cancelled",
      );
      router.refresh();
    }
  };

  return (
    <Card className="chart-card rounded-xl">
      <CardHeader className="py-3 px-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Material issues (RAW → commissary)</CardTitle>
            <CardDescription className="text-xs">
              Bulk material transfers from Actions. Approve then mark received to move stock into
              the commissary warehouse.
            </CardDescription>
          </div>
          {warehouses && warehouses.length > 1 && selectedWarehouse && onWarehouseChange && (
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From → To</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination && pagination.totalItems === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No material issues. Use Actions → Bulk material issue (RAW → commissary).
                </TableCell>
              </TableRow>
            ) : transfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No material issues on this page.
                </TableCell>
              </TableRow>
            ) : (
              transfers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">
                    <span className="font-medium">{t.fromWarehouseName}</span>
                    <span className="text-muted-foreground"> → {t.toWarehouseName}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{t.itemName}</span>
                    <span className="block text-xs text-muted-foreground font-mono">{t.itemSku}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {t.quantity} {t.itemUnit}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(t.totalCost)}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_STYLES[t.status] || ""}>
                      {t.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDisplayDate(t.transferDate)}
                  </TableCell>
                  <TableCell>
                    {canMutate && (t.status === "PENDING" || t.status === "IN_TRANSIT") && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {t.status === "PENDING" && (
                            <DropdownMenuItem
                              onClick={() => handleStatus(t.id, "IN_TRANSIT" as TransferStatus)}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                          )}
                          {t.status === "IN_TRANSIT" && (
                            <DropdownMenuItem
                              onClick={() => handleStatus(t.id, "COMPLETED" as TransferStatus)}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark received
                            </DropdownMenuItem>
                          )}
                          {t.status === "PENDING" && (
                            <DropdownMenuItem
                              onClick={() => handleStatus(t.id, "COMPLETED" as TransferStatus)}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark received (skip approve)
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleStatus(t.id, "CANCELLED" as TransferStatus)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel
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
        {pagination && pagination.totalItems > 0 && (
          <TablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
          />
        )}
        {openCount > 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-400 px-4 py-3 border-t">
            {openCount} open material issue(s) — stock moves when marked received.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
