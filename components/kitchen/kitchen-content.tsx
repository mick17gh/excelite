"use client";

import { useMemo, useState, useTransition, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  RefreshCw,
  Volume2,
  VolumeX,
  Undo2,
  FastForward,
} from "lucide-react";
import { updateKitchenItemStatus, bumpTicket, recallTicket, listKitchenTickets } from "@/lib/actions/kitchen";
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
    configurationLabel?: string | null;
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

export function KitchenContent({ branches, stations, tickets: initialTickets }: KitchenContentProps) {
  const [tickets, setTickets] = useState(initialTickets);
  const [branchId, setBranchId] = useState<string>("all");
  const [stationId, setStationId] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastTicketCount, setLastTicketCount] = useState(initialTickets.length);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh tickets every 10 seconds
  const refreshTickets = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await listKitchenTickets(
        branchId === "all" ? undefined : branchId,
        stationId === "all" ? undefined : stationId
      );
      if (result.success && result.data) {
        const newTickets = result.data as Ticket[];
        
        // Check for new tickets and play sound
        const activeNewTickets = newTickets.filter(t => t.status !== "COMPLETED");
        if (soundEnabled && activeNewTickets.length > lastTicketCount) {
          // Visual notification since we can't play audio without user interaction
          toast.info("New order received!", { duration: 3000 });
        }
        setLastTicketCount(activeNewTickets.length);
        setTickets(newTickets);
      }
    } catch (error) {
      console.error("Failed to refresh tickets:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [branchId, stationId, soundEnabled, lastTicketCount]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(refreshTickets, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshTickets]);

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
      refreshTickets();
    });
  };

  const handleBumpTicket = (ticketId: string) => {
    startTransition(async () => {
      const res = await bumpTicket(ticketId);
      if (!res.success) {
        toast.error(res.error || "Failed to bump ticket");
        return;
      }
      toast.success("Ticket bumped");
      refreshTickets();
    });
  };

  const handleRecallTicket = (ticketId: string) => {
    startTransition(async () => {
      const res = await recallTicket(ticketId);
      if (!res.success) {
        toast.error(res.error || "Failed to recall ticket");
        return;
      }
      toast.success("Ticket recalled");
      refreshTickets();
    });
  };

  const stats = useMemo(() => {
    const newCount = filteredTickets.filter((t) => t.status === "NEW").length;
    const inProgressCount = filteredTickets.filter((t) => t.status === "IN_PROGRESS").length;
    const readyCount = filteredTickets.filter((t) => t.status === "READY").length;
    return { newCount, inProgressCount, readyCount, total: filteredTickets.length };
  }, [filteredTickets]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Fixed Header */}
      <div className="flex flex-col gap-4 shrink-0">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isRefreshing && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Controls */}
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-xs cursor-pointer">
                Auto-refresh
              </Label>
              <div className="w-px h-4 bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Mute notifications" : "Enable notifications"}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => refreshTickets()}
                disabled={isRefreshing}
                title="Refresh now"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>

            {/* Filters */}
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="w-[160px] h-9 bg-background">
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
              <SelectTrigger className="w-[160px] h-9 bg-background">
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

        {/* Stats Cards - Compact */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">New Orders</p>
                  <p className="text-xl font-bold text-blue-600">{stats.newCount}</p>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">In Progress</p>
                  <p className="text-xl font-bold text-amber-600">{stats.inProgressCount}</p>
                </div>
                <div className="rounded-lg bg-amber-500/10 p-2">
                  <Play className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Ready</p>
                  <p className="text-xl font-bold text-emerald-600">{stats.readyCount}</p>
                </div>
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Total Active</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2">
                  <ChefHat className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Scrollable Tickets Grid */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 p-1 pb-4">
            {filteredTickets.map((ticket) => {
              const timeElapsed = calculateTimeElapsed(ticket.createdAt);
              const StatusIcon = getStatusIcon(ticket.status);
              const isUrgent = timeElapsed > 15;

              return (
                <Card
                  key={ticket.id}
                  className={cn(
                    "transition-all hover:shadow-md border",
                    isUrgent && ticket.status !== "READY" && "border-red-500/50 bg-red-500/5 ring-2 ring-red-500/20"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base flex items-center gap-2">
                          <span className="font-mono text-sm font-bold">{ticket.order.orderNumber}</span>
                          <Badge variant="outline" className="text-xs h-5">
                            {ticket.station.name}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1.5 flex items-center gap-2 text-xs">
                          <span>{ticket.order.branch.name}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {timeElapsed}m ago
                          </span>
                        </CardDescription>
                      </div>
                      <Badge className={cn("border shrink-0", statusColor(ticket.status))}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {ticket.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    {isUrgent && ticket.status !== "READY" && (
                      <div className="mt-2">
                        <Progress value={Math.min((timeElapsed / 20) * 100, 100)} className="h-1.5" />
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 font-medium">
                          ⚠️ Order taking longer than expected
                        </p>
                      </div>
                    )}
                    {/* Ticket-level actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      {ticket.status === "READY" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRecallTicket(ticket.id)}
                          disabled={isPending}
                          className="h-7 text-xs"
                        >
                          <Undo2 className="mr-1 h-3 w-3" />
                          Recall
                        </Button>
                      )}
                      {ticket.status !== "READY" && ticket.status !== "COMPLETED" && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleBumpTicket(ticket.id)}
                          disabled={isPending}
                          className="h-7 text-xs"
                        >
                          <FastForward className="mr-1 h-3 w-3" />
                          Bump All
                        </Button>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {ticket.items.length} item{ticket.items.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {ticket.items.map((item) => {
                      const itemTimeElapsed = calculateTimeElapsed(item.createdAt);
                      const ItemStatusIcon = getStatusIcon(item.status);

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-lg border p-2.5 transition-colors",
                            item.status === "NEW" && "bg-blue-500/5 border-blue-500/20",
                            item.status === "IN_PROGRESS" && "bg-amber-500/5 border-amber-500/20",
                            item.status === "READY" && "bg-emerald-500/5 border-emerald-500/20"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm leading-tight">
                              {item.orderItem.quantity}× {item.orderItem.menuItem.name}
                              {item.orderItem.configurationLabel ? (
                                <span className="font-normal text-muted-foreground">
                                  {" "}
                                  ({item.orderItem.configurationLabel})
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className={cn("text-xs border h-5", statusColor(item.status))}
                              >
                                <ItemStatusIcon className="mr-1 h-2.5 w-2.5" />
                                {item.status.replace(/_/g, " ")}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {itemTimeElapsed}m
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            {item.status === "NEW" && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => bumpItem(item.id, "IN_PROGRESS")}
                                disabled={isPending}
                                className="h-7 px-2.5 text-xs"
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
                                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700"
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
                                className="h-7 px-2.5 text-xs"
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
              <Card className="lg:col-span-2 xl:col-span-3">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <ChefHat className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">No Active Tickets</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    All orders are completed or there are no active kitchen tickets for the selected filters.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
