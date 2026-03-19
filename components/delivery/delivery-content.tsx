"use client";

import { useState, useMemo } from "react";
import { DeliveryStatus } from "@/lib/generated/prisma/client";
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
  Truck,
  Clock,
  CheckCircle2,
  MapPin,
  Search,
  MoreHorizontal,
  ArrowRight,
  XCircle,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { updateDeliveryStatus } from "@/lib/actions/delivery";
import { AssignDriverDialog } from "./delivery-forms";
import { useCurrency } from "@/contexts/currency-context";

interface DeliveryRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  orderTotal: number;
  orderStatus: string;
  orderSource: string;
  branchName: string;
  customerName: string | null;
  customerPhone: string | null;
  provider: string | null;
  externalId: string | null;
  pickupAddress: string | null;
  deliveryAddress: string | null;
  deliveryPhone: string | null;
  status: string;
  driverName: string | null;
  driverPhone: string | null;
  estimatedTime: number | null;
  actualPickupTime: string | null;
  actualDeliveryTime: string | null;
  fee: number;
  notes: string | null;
  createdAt: string;
}

interface DeliveryStats {
  total: number;
  active: number;
  deliveredToday: number;
  avgEstimatedTime: number;
}

interface DeliveryContentProps {
  deliveries: DeliveryRequest[];
  stats: DeliveryStats;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  ASSIGNED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PICKED_UP: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  IN_TRANSIT: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  DELIVERED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
};

export function DeliveryContent({ deliveries, stats }: DeliveryContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignDriver, setAssignDriver] = useState<DeliveryRequest | null>(null);
  const { formatCurrency } = useCurrency();

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      const matchesSearch =
        !searchQuery ||
        d.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.deliveryAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.driverName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [deliveries, searchQuery, statusFilter]);

  const getNextStatus = (current: string): string | null => {
    const flow: Record<string, string> = {
      ASSIGNED: "PICKED_UP",
      PICKED_UP: "IN_TRANSIT",
      IN_TRANSIT: "DELIVERED",
    };
    return flow[current] || null;
  };

  const handleStatusChange = async (id: string, status: string) => {
    const result = await updateDeliveryStatus({ id, status: status as DeliveryStatus });
    if (result.error) toast.error(result.error);
    else toast.success(`Status updated to ${STATUS_LABELS[status]}`);
  };

  const handleCancel = async (id: string) => {
    const result = await updateDeliveryStatus({ id, status: "CANCELLED" as DeliveryStatus });
    if (result.error) toast.error(result.error);
    else toast.success("Delivery cancelled");
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Total Deliveries</p>
                <p className="text-base font-bold mt-0.5">{stats.total}</p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <Truck className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Active</p>
                <p className="text-base font-bold mt-0.5 text-amber-600">{stats.active}</p>
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
                <p className="text-[11px] font-medium text-muted-foreground truncate">Delivered Today</p>
                <p className="text-base font-bold mt-0.5 text-emerald-600">{stats.deliveredToday}</p>
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
                <p className="text-[11px] font-medium text-muted-foreground truncate">Avg. Est. Time</p>
                <p className="text-base font-bold mt-0.5">{stats.avgEstimatedTime} min</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-purple-100 dark:bg-purple-900/30">
                <MapPin className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search deliveries..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ASSIGNED">Assigned</SelectItem>
            <SelectItem value="PICKED_UP">Picked Up</SelectItem>
            <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Delivery Address</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No deliveries found</TableCell>
                </TableRow>
              ) : (
                filteredDeliveries.map((d) => {
                  const nextStatus = getNextStatus(d.status);
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <span className="font-mono text-sm font-medium">{d.orderNumber}</span>
                        <span className="block text-xs text-muted-foreground">{formatCurrency(d.orderTotal)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{d.customerName}</span>
                        <span className="block text-xs text-muted-foreground">{d.deliveryPhone}</span>
                      </TableCell>
                      <TableCell className="text-sm">{d.branchName}</TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">{d.deliveryAddress}</TableCell>
                      <TableCell>
                        {d.driverName ? (
                          <div>
                            <span className="text-sm">{d.driverName}</span>
                            <span className="block text-xs text-muted-foreground">{d.driverPhone}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[d.status] || ""}>{STATUS_LABELS[d.status] || d.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(d.fee)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(d.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</TableCell>
                      <TableCell>
                        {d.status !== "DELIVERED" && d.status !== "CANCELLED" && d.status !== "FAILED" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {d.status === "PENDING" && (
                                <DropdownMenuItem onClick={() => setAssignDriver(d)}>
                                  <User className="mr-2 h-4 w-4" />Assign Driver
                                </DropdownMenuItem>
                              )}
                              {nextStatus && (
                                <DropdownMenuItem onClick={() => handleStatusChange(d.id, nextStatus)}>
                                  <ArrowRight className="mr-2 h-4 w-4" />{STATUS_LABELS[nextStatus]}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-red-600" onClick={() => handleCancel(d.id)}>
                                <XCircle className="mr-2 h-4 w-4" />Cancel
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {assignDriver && (
        <AssignDriverDialog
          delivery={assignDriver}
          open={!!assignDriver}
          onOpenChange={(open) => !open && setAssignDriver(null)}
        />
      )}
    </div>
  );
}
