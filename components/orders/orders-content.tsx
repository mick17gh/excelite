"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus, cancelOrder, getOrders } from "@/lib/actions/orders";
import { verifyPaystackOrderPayment } from "@/lib/actions/payments";
import { CreateOrderDialog } from "./order-forms";
import { OrderDetailModal } from "./order-detail-modal";
import { useCurrency } from "@/contexts/currency-context";

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

interface Order {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  branchId: string;
  branchName: string;
  branchCode: string;
  assignedBy: string | null;
  source: string;
  type: string;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string | null;
  paymentStatus: string;
  paystackEnabled?: boolean;
  notes: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryPhone: string | null;
  deliveryNotes: string | null;
  deliveryStatus: string | null;
  items: OrderItem[];
  payments: PaymentItem[];
  notifications: any[];
  receipt: any | null;
  createdAt: string;
  updatedAt: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  taxRate: number;
  taxEnabled: boolean;
  taxName: string;
}

interface MenuItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  categoryId: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedToday: number;
  todayRevenue: number;
}

interface OrdersContentProps {
  orders: Order[];
  branches: Branch[];
  menuItems: MenuItem[];
  customers: Customer[];
  stats: OrderStats;
  initialTotal?: number;
  initialPage?: number;
  initialPageSize?: number;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  READY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const SOURCE_LABELS: Record<string, string> = {
  CALL_CENTER: "Call Center",
  ONLINE: "Online",
  WHATSAPP: "WhatsApp",
  WALK_IN: "Walk-in",
  POS: "POS",
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

export function OrdersContent({ orders: initialOrders, branches, menuItems, customers, stats, initialTotal = 0, initialPage = 1, initialPageSize = 50 }: OrdersContentProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { formatCurrency } = useCurrency();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Handle new order creation - automatically open detail modal
  const handleOrderCreated = async (orderId: string) => {
    // Refresh orders to get the new order
    await fetchOrders(false);
    // Find and select the new order
    const result = await getOrders({ page, pageSize });
    if (result.data) {
      const newOrder = result.data.find((o: any) => o.id === orderId);
      if (newOrder) {
        setSelectedOrder(newOrder);
      }
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        !searchQuery ||
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerPhone?.includes(searchQuery);
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesSource = sourceFilter === "all" || order.source === sourceFilter;
      const matchesBranch = branchFilter === "all" || order.branchId === branchFilter;
      return matchesSearch && matchesStatus && matchesSource && matchesBranch;
    });
  }, [orders, searchQuery, statusFilter, sourceFilter, branchFilter]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const result = await updateOrderStatus({ id: orderId, status: newStatus as any });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Order status updated to ${STATUS_LABELS[newStatus]}`);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const result = await cancelOrder(orderId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Order cancelled");
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

  // Fetch orders with current filters and pagination
  const fetchOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const result = await getOrders({ page, pageSize });
      if (result.data) {
        setOrders(result.data);
        setTotal(result.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  }, [page, pageSize]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders(false); // Silent refresh
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Fetch when page or pageSize changes
  useEffect(() => {
    fetchOrders();
  }, [page, pageSize, fetchOrders]);

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
      {/* KPI Cards */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Total Orders</p>
                <p className="text-base font-bold mt-0.5">{stats.totalOrders}</p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Pending</p>
                <p className="text-base font-bold mt-0.5 text-amber-600">{stats.pendingOrders}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Completed Today</p>
                <p className="text-base font-bold mt-0.5 text-emerald-600">{stats.completedToday}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Today Revenue</p>
                <p className="text-base font-bold mt-0.5">{formatCurrency(stats.todayRevenue)}</p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
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
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="READY">Ready</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="CALL_CENTER">Call Center</SelectItem>
              <SelectItem value="ONLINE">Online</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              <SelectItem value="WALK_IN">Walk-in</SelectItem>
              <SelectItem value="POS">POS</SelectItem>
            </SelectContent>
          </Select>
          {branches.length > 1 && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Orders Table */}
      <Card className="rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const nextStatus = getNextStatus(order.status);
                  return (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedOrder(order)}>
                      <TableCell className="font-mono text-sm font-medium">{order.orderNumber}</TableCell>
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
                        <Badge variant="outline" className="text-xs">{SOURCE_LABELS[order.source] || order.source}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{TYPE_LABELS[order.type] || order.type}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[order.status] || "bg-slate-100 text-slate-700"}>
                          {STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            order.paymentStatus === "PAID"
                              ? "border-green-500 text-green-600"
                              : order.paymentStatus === "FAILED"
                              ? "border-red-500 text-red-600"
                              : "border-amber-500 text-amber-600"
                          }
                        >
                          {order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell>
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
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}>
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
                                onClick={(e) => { e.stopPropagation(); handleCancelOrder(order.id); }}
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
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <p className="text-sm text-muted-foreground">
            Showing {filteredOrders.length} of {total} orders
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isRefreshing}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / pageSize) || isRefreshing}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <CreateOrderDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        branches={branches}
        menuItems={menuItems}
        customers={customers}
        onOrderCreated={handleOrderCreated}
      />

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          open={!!selectedOrder}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
          onRefresh={async () => {
            const result = await getOrders({ page, pageSize });
            if (result.data) {
              setOrders(result.data);
              setTotal(result.total || 0);
              // Update selectedOrder with fresh data
              const updated = result.data.find((o: any) => o.id === selectedOrder.id);
              if (updated) setSelectedOrder(updated);
            }
          }}
        />
      )}
    </div>
  );
}
