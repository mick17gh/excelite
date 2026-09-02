"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ContentCard } from "@/components/dashboard/content-card";
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
  ShoppingCart,
  Clock,
  CheckCircle2,
  DollarSign,
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  XCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus, cancelOrder, getOrders, getOrderStats } from "@/lib/actions/orders";
import { verifyPaystackOrderPayment } from "@/lib/actions/payments";
import { CreateOrderDialog } from "./order-forms";
import type { CustomerPickerOption } from "@/components/customers/customer-picker";
import { OrderDetailModal } from "./order-detail-modal";
import { useCurrency } from "@/contexts/currency-context";
import { TablePagination } from "@/components/ui/table-pagination";
import { useIntervalWhenVisible } from "@/hooks/use-interval-when-visible";
import { useAdaptivePollInterval } from "@/hooks/use-adaptive-poll-interval";
import {
  fetchOrderDetail,
  prefetchOrderDetail,
  invalidateOrderDetail,
  type UiOrder,
} from "@/lib/orders/order-detail-cache";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  orderStatusBadgeClass,
  ordersToolbarClass,
  paymentStatusBadgeClass,
} from "@/components/orders/order-styles";

interface OrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  menuItemSku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes: string | null;
}

interface PaymentItem {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  paidAt: string | null;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  taxRate: number;
  taxEnabled: boolean;
  taxName: string;
}

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedToday: number;
  todayRevenue: number;
}

interface Order extends UiOrder {}

interface OrdersContentProps {
  orders: Order[];
  branches: Branch[];
  stats: OrderStats;
  customers?: CustomerPickerOption[];
  initialTotal?: number;
  initialPage?: number;
  initialPageSize?: number;
  tableManagementEnabled?: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  CALL_CENTER: "Call Center",
  ONLINE: "Online",
  WHATSAPP: "WhatsApp",
  WALK_IN: "Walk-in",
  POS: "POS",
  SOCIAL_MEDIA: "Social Media",
};

const TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Dine In",
  TAKEOUT: "Takeout",
  DELIVERY: "Delivery",
  APP: "App",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function OrdersContent({
  orders: initialOrders,
  branches,
  stats: initialStats,
  customers = [],
  initialTotal = 0,
  initialPage = 1,
  initialPageSize = 50,
  tableManagementEnabled = false,
}: OrdersContentProps) {
  const skipInitialFetch = useRef(true);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [stats, setStats] = useState(initialStats);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const { formatCurrency } = useCurrency();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const listPollMs = useAdaptivePollInterval({ baseMs: 30_000 });
  const statsPollMs = useAdaptivePollInterval({ baseMs: 120_000 });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectOrder = useCallback(async (order: Order) => {
    setSelectedOrder({
      ...order,
      items: order.items ?? [],
      payments: order.payments ?? [],
      notifications: order.notifications ?? [],
      receipt: order.receipt ?? null,
      deliveryStatus: order.deliveryStatus ?? null,
    });
    const detail = await fetchOrderDetail(order.id);
    if (detail) setSelectedOrder(detail);
  }, []);

  const handleOrderCreated = async (orderId: string) => {
    await fetchOrders(false);
    invalidateOrderDetail(orderId);
    const detail = await fetchOrderDetail(orderId, true);
    if (detail) setSelectedOrder(detail);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const result = await updateOrderStatus({ id: orderId, status: newStatus as any });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Order status updated to ${STATUS_LABELS[newStatus]}`);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel) return;
    setIsCancelling(true);
    try {
      const result = await cancelOrder(orderToCancel.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Order cancelled");
        setOrderToCancel(null);
        await fetchOrders(false);
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const getNextStatus = (current: string): string | null => {
    const flow: Record<string, string> = {
      NEW: "IN_PROGRESS",
      IN_PROGRESS: "READY",
      READY: "COMPLETED",
    };
    return flow[current] || null;
  };

  const fetchOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const result = await getOrders({
        page,
        pageSize,
        search: debouncedSearch || undefined,
        branchId: branchFilter !== "all" ? branchFilter : undefined,
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
        source: sourceFilter !== "all" ? (sourceFilter as any) : undefined,
      });
      if (result.data) {
        setOrders(result.data as Order[]);
        setTotal(result.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  }, [page, pageSize, debouncedSearch, branchFilter, statusFilter, sourceFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await getOrderStats(
        branchFilter !== "all" ? branchFilter : undefined,
      );
      if (result.data) setStats(result.data);
    } catch (error) {
      console.error("Failed to fetch order stats:", error);
    }
  }, [branchFilter]);

  useIntervalWhenVisible(() => {
    void fetchOrders(false);
  }, listPollMs);

  useIntervalWhenVisible(() => {
    void fetchStats();
  }, statsPollMs);

  useEffect(() => {
    setPage(1);
  }, [branchFilter, statusFilter, sourceFilter, debouncedSearch]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    fetchOrders();
  }, [page, pageSize, branchFilter, statusFilter, sourceFilter, debouncedSearch, fetchOrders]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const refreshSelectedOrder = useCallback(async () => {
    if (!selectedOrder) return;
    invalidateOrderDetail(selectedOrder.id);
    const detail = await fetchOrderDetail(selectedOrder.id, true);
    if (detail) {
      setSelectedOrder(detail);
      setOrders((prev) =>
        prev.map((row) =>
          row.id === detail.id
            ? {
                ...row,
                status: detail.status,
                paymentStatus: detail.paymentStatus,
                total: detail.total,
                updatedAt: detail.updatedAt,
              }
            : row,
        ),
      );
    }
  }, [selectedOrder]);

  // Handle Paystack callback verification after redirect back from Paystack
  useEffect(() => {
    const marker = searchParams.get("paystackCallback");
    const orderId = searchParams.get("orderId");
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (marker !== "1" || !orderId || !reference) return;

    let cancelled = false;
    const toastId = toast.loading("Verifying Paystack payment...");
    (async () => {
      const result = await verifyPaystackOrderPayment({ orderId, reference });
      if (cancelled) {
        toast.dismiss(toastId);
        return;
      }
      if (result.error) {
        const message = result.details ? `${result.error}: ${result.details}` : result.error;
        toast.error(message, { id: toastId });
      } else {
        toast.success("Paystack payment verified", { id: toastId });
        await fetchOrders(false);
      }
      router.replace(pathname);
    })();

    return () => {
      cancelled = true;
      toast.dismiss(toastId);
    };
  }, [searchParams, fetchOrders, router, pathname]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Today's Orders" value={stats.totalOrders} icon={ShoppingCart} />
        <KPICard title="Pending Today" value={stats.pendingOrders} icon={Clock} />
        <KPICard title="Completed Today" value={stats.completedToday} icon={CheckCircle2} />
        <KPICard
          title="Today's Revenue"
          value={stats.todayRevenue}
          format="currency"
          icon={DollarSign}
        />
      </div>

      <ContentCard>
        <div className={ordersToolbarClass}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 rounded-xl bg-background border-border/80 focus-visible:ring-[#22C55E]/30"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36 h-10 rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="READY">Ready</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full sm:w-36 h-10 rounded-xl">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="CALL_CENTER">Call Center</SelectItem>
              <SelectItem value="ONLINE">Online</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              <SelectItem value="WALK_IN">Walk-in</SelectItem>
              <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
              <SelectItem value="POS">POS</SelectItem>
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-full sm:w-40 h-10 rounded-xl">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              size="sm"
              className="h-10 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-sm shrink-0"
            >
              <Plus className="mr-2 h-4 w-4" />
              New order
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order #</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Branch</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</TableHead>
                {tableManagementEnabled && (
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Table</TableHead>
                )}
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Placed By</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tableManagementEnabled ? 12 : 11} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
                      <p className="font-medium">No orders found</p>
                      <p className="text-sm">Try adjusting filters or create a new order</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const nextStatus = getNextStatus(order.status);
                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-[#22C55E]/5 transition-colors"
                      onClick={() => void handleSelectOrder(order)}
                      onMouseEnter={() => prefetchOrderDetail(order.id)}
                    >
                      <TableCell className="font-mono text-sm font-semibold text-[#222831]">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="text-sm">{order.customerName || "Walk-in"}</span>
                          {order.customerPhone && (
                            <span className="block text-xs text-muted-foreground">{order.customerPhone}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{order.branchName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs rounded-md border-border/80">
                          {SOURCE_LABELS[order.source] || order.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{TYPE_LABELS[order.type] || order.type}</TableCell>
                      {tableManagementEnabled && (
                        <TableCell className="text-sm">
                          {order.tableLabel
                            ? `${order.tableLabel}${order.tableCovers ? ` (${order.tableCovers})` : ""}`
                            : order.type === "DINE_IN"
                              ? "Counter"
                              : "—"}
                        </TableCell>
                      )}
                      <TableCell className="text-sm text-muted-foreground">
                        {order.placedBy || order.assignedBy || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={orderStatusBadgeClass(order.status)}>
                          {STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={paymentStatusBadgeClass(order.paymentStatus)}>
                          {order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[#16A34A]">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); void handleSelectOrder(order); }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {nextStatus && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, nextStatus); }}>
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Move to {STATUS_LABELS[nextStatus]}
                              </DropdownMenuItem>
                            )}
                            {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrderToCancel(order);
                                }}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel Order
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </ContentCard>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchOrders(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          pageSizeOptions={[25, 50, 100, 200]}
        />
      </div>

      <CreateOrderDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        branches={branches}
        customers={customers}
        onOrderCreated={handleOrderCreated}
      />

      <AlertDialog
        open={!!orderToCancel}
        onOpenChange={(open) => {
          if (!open && !isCancelling) setOrderToCancel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order?</AlertDialogTitle>
            <AlertDialogDescription>
              {orderToCancel
                ? `This will cancel order ${orderToCancel.orderNumber}. Kitchen tickets for this order will also be cancelled. This action cannot be undone.`
                : "This will cancel the order. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep order</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isCancelling}
              onClick={(e) => {
                e.preventDefault();
                void handleCancelOrder();
              }}
            >
              {isCancelling ? "Cancelling..." : "Cancel order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          open={!!selectedOrder}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
          onRefresh={refreshSelectedOrder}
        />
      )}
    </div>
  );
}
