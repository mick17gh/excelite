"use client";

import { useMemo, useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  CheckCircle2,
  Play,
  AlertCircle,
  ChefHat,
  Timer,
} from "lucide-react";
import { updateKitchenItemStatus } from "@/lib/actions/kitchen";
import { OrderStatus } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface Station {
  id: string;
  branchId: string;
  name: string;
}

interface KitchenItem {
  id: string;
  status: OrderStatus;
  createdAt: Date;
  orderItem: {
    quantity: number;
    menuItem: { name: string };
  };
}

interface Ticket {
  id: string;
  status: OrderStatus;
  createdAt: Date;
  station: { id: string; name: string; branchId: string };
  order: { orderNumber: string; branch: { name: string } };
  items: KitchenItem[];
}

interface KitchenContentProps {
  branches: Branch[];
  stations: Station[];
  tickets: Ticket[];
}

function statusColor(status: OrderStatus) {
  switch (status) {
    case "NEW":
      return "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "IN_PROGRESS":
      return "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "READY":
      return "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "COMPLETED":
      return "bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30";
    default:
      return "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30";
  }
}

function getStatusIcon(status: OrderStatus) {
  switch (status) {
    case "NEW":
      return AlertCircle;
    case "IN_PROGRESS":
      return Play;
    case "READY":
      return CheckCircle2;
    case "COMPLETED":
      return CheckCircle2;
    default:
      return Clock;
  }
}

function calculateTimeElapsed(createdAt: Date): number {
  return Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 1000 / 60);
}

export function KitchenContent({ branches, stations, tickets }: KitchenContentProps) {
  const [branchId, setBranchId] = useState<string>("all");
  const [stationId, setStationId] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  const filteredStations = useMemo(() => {
    if (branchId === "all") return stations;
    return stations.filter((s) => s.branchId === branchId);
  }, [stations, branchId]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const branchOk = branchId === "all" || t.station.branchId === branchId;
      const stationOk = stationId === "all" || t.station.id === stationId;
      return branchOk && stationOk && t.status !== "COMPLETED";
    });
  }, [tickets, branchId, stationId]);

  const bumpItem = (itemId: string, status: OrderStatus) => {
    startTransition(async () => {
      const res = await updateKitchenItemStatus(itemId, status);
      if (!res.success) {
        toast.error(res.error || "Failed to update item status");
        return;
      }
      toast.success("Item status updated");
    });
  };

  const stats = useMemo(() => {
    const newCount = filteredTickets.filter((t) => t.status === "NEW").length;
    const inProgressCount = filteredTickets.filter((t) => t.status === "IN_PROGRESS").length;
    const readyCount = filteredTickets.filter((t) => t.status === "READY").length;
    return { newCount, inProgressCount, readyCount, total: filteredTickets.length };
  }, [filteredTickets]);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kitchen Display System</h2>
          <p className="text-muted-foreground">Monitor and manage kitchen orders in real-time</p>
        </div>
        <div className="flex gap-3">
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="All stations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stations</SelectItem>
              {filteredStations.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Orders</p>
                <p className="text-xl font-bold text-blue-600">{stats.newCount}</p>
              </div>
              <div className="rounded-xl bg-blue-500/10 p-3">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-xl font-bold text-amber-600">{stats.inProgressCount}</p>
              </div>
              <div className="rounded-xl bg-amber-500/10 p-3">
                <Play className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready</p>
                <p className="text-xl font-bold text-emerald-600">{stats.readyCount}</p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 p-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Active</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <ChefHat className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Grid */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {filteredTickets.map((ticket) => {
          const timeElapsed = calculateTimeElapsed(ticket.createdAt);
          const StatusIcon = getStatusIcon(ticket.status);
          const isUrgent = timeElapsed > 15;

          return (
            <Card
              key={ticket.id}
              className={cn(
                "glass transition-all hover:shadow-lg",
                isUrgent && ticket.status !== "READY" && "border-red-500/50 bg-red-500/5"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="font-mono text-sm">{ticket.order.orderNumber}</span>
                      <Badge variant="outline" className="text-xs">
                        {ticket.station.name}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      <span>{ticket.order.branch.name}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {timeElapsed}m ago
                      </span>
                    </CardDescription>
                  </div>
                  <Badge className={cn("border", statusColor(ticket.status))}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {ticket.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {isUrgent && ticket.status !== "READY" && (
                  <div className="mt-2">
                    <Progress value={Math.min((timeElapsed / 20) * 100, 100)} className="h-1" />
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      ⚠️ Order taking longer than expected
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.items.map((item) => {
                  const itemTimeElapsed = calculateTimeElapsed(item.createdAt);
                  const ItemStatusIcon = getStatusIcon(item.status);

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                        item.status === "NEW" && "bg-blue-500/5 border-blue-500/20",
                        item.status === "IN_PROGRESS" && "bg-amber-500/5 border-amber-500/20",
                        item.status === "READY" && "bg-emerald-500/5 border-emerald-500/20"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">
                          {item.orderItem.quantity}× {item.orderItem.menuItem.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={cn("text-xs border", statusColor(item.status))}
                          >
                            <ItemStatusIcon className="mr-1 h-2.5 w-2.5" />
                            {item.status.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {itemTimeElapsed}m
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {item.status === "NEW" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => bumpItem(item.id, "IN_PROGRESS")}
                            disabled={isPending}
                            className="h-8 px-3"
                          >
                            <Play className="mr-1 h-3 w-3" />
                            Start
                          </Button>
                        )}
                        {item.status === "IN_PROGRESS" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => bumpItem(item.id, "READY")}
                            disabled={isPending}
                            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Ready
                          </Button>
                        )}
                        {item.status === "READY" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => bumpItem(item.id, "COMPLETED")}
                            disabled={isPending}
                            className="h-8 px-3"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        {filteredTickets.length === 0 && (
          <Card className="glass lg:col-span-2 xl:col-span-3">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ChefHat className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg mb-1">No Active Tickets</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                All orders are completed or there are no active kitchen tickets for the selected
                filters.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
