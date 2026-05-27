"use client";

import { useMemo, useState, useTransition, useEffect, useCallback, useRef } from "react";
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
import {
  updateKitchenItemStatus,
  bumpTicket,
  completeAllTicketItems,
  recallTicket,
  listKitchenTickets,
} from "@/lib/actions/kitchen";
import { OrderStatus } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { playNewOrderSound, unlockKitchenAudio } from "@/lib/kitchen/new-order-sound";

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
    notes?: string | null;
    configurationLabel?: string | null;
    menuItem: { name: string };
  };
}

interface Ticket {
  id: string;
  status: OrderStatus;
  createdAt: Date;
  station: { id: string; name: string; branchId: string };
  order: {
    orderNumber: string;
    notes?: string | null;
    branch: { name: string };
    tableSession?: {
      guestCount: number;
      table: { label: string };
      opener?: { name: string } | null;
    } | null;
  };
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

/** Solid dark blue — kitchen ticket actions avoid the default gradient button style */
const kitchenActionBtn =
  "bg-blue-700 text-white hover:bg-blue-800 shadow-none hover:shadow-none";

export function KitchenContent({ branches, stations, tickets: initialTickets }: KitchenContentProps) {
  const [tickets, setTickets] = useState(initialTickets);
  const [branchId, setBranchId] = useState<string>("all");
  const [stationId, setStationId] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const knownTicketIdsRef = useRef(new Set(initialTickets.map((t) => t.id)));
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unlockOnInteraction = () => {
      unlockKitchenAudio();
      setSoundUnlocked(true);
    };
    document.addEventListener("click", unlockOnInteraction, { once: true });
    document.addEventListener("keydown", unlockOnInteraction, { once: true });
    return () => {
      document.removeEventListener("click", unlockOnInteraction);
      document.removeEventListener("keydown", unlockOnInteraction);
    };
  }, []);

  const handleSoundToggle = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      unlockKitchenAudio();
      void playNewOrderSound().then((played) => {
        if (played) {
          setSoundUnlocked(true);
        } else {
          toast.message("Sound enabled", {
            description: "Click anywhere on this page once if you don't hear the test chime.",
          });
        }
      });
    }
  };

  useEffect(() => {
    knownTicketIdsRef.current = new Set(
      tickets
        .filter((t) => {
          const branchOk = branchId === "all" || t.station.branchId === branchId;
          const stationOk = stationId === "all" || t.station.id === stationId;
          return branchOk && stationOk;
        })
        .map((t) => t.id)
    );
    // Only re-baseline when the user changes filters, not on every poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, stationId]);

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
        const unseenNewTickets = newTickets.filter(
          (t) => t.status === "NEW" && !knownTicketIdsRef.current.has(t.id)
        );

        if (soundEnabled && unseenNewTickets.length > 0) {
          const played = await playNewOrderSound();
          if (!played && !soundUnlocked) {
            toast.message("New order received", {
              description: "Click the speaker icon or anywhere on the page to enable sound alerts.",
              duration: 5000,
            });
          } else {
            toast.info(
              unseenNewTickets.length === 1
                ? "New order received!"
                : `${unseenNewTickets.length} new orders received!`,
              { duration: 3000 }
            );
          }
        }

        knownTicketIdsRef.current = new Set(
          newTickets.filter((t) => t.status !== "COMPLETED").map((t) => t.id)
        );
        setTickets(newTickets);
      }
    } catch (error) {
      console.error("Failed to refresh tickets:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [branchId, stationId, soundEnabled, soundUnlocked]);

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

  const handleCompleteAll = (ticketId: string) => {
    startTransition(async () => {
      const res = await completeAllTicketItems(ticketId);
      if (!res.success) {
        toast.error(res.error || "Failed to complete all items");
        return;
      }
      toast.success("All items completed");
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
                onClick={handleSoundToggle}
                title={
                  soundEnabled
                    ? soundUnlocked
                      ? "Mute notifications"
                      : "Sound on — click to test / unlock audio"
                    : "Enable sound notifications"
                }
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
              const hasIncompleteItems = ticket.items.some((item) => item.status !== "COMPLETED");
              const canBumpTicket =
                ticket.status !== "READY" && ticket.status !== "COMPLETED";
              const canCompleteAll =
                ticket.status === "READY" &&
                hasIncompleteItems;

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
                        <CardDescription className="mt-1.5 flex flex-col gap-0.5 text-xs">
                          <span className="flex items-center gap-2">
                            <span>{ticket.order.branch.name}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {timeElapsed}m ago
                            </span>
                          </span>
                          {ticket.order.tableSession?.table?.label && (
                            <span className="font-medium text-foreground">
                              Table {ticket.order.tableSession.table.label}
                              {ticket.order.tableSession.opener?.name
                                ? ` · ${ticket.order.tableSession.opener.name}`
                                : ""}
                              {ticket.order.tableSession.guestCount
                                ? ` · ${ticket.order.tableSession.guestCount} covers`
                                : ""}
                            </span>
                          )}
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
                    {ticket.order.notes && (
                      <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300">
                          Order note
                        </p>
                        <p className="text-xs text-foreground">{ticket.order.notes}</p>
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
                      {canBumpTicket && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleBumpTicket(ticket.id)}
                          disabled={isPending}
                          className={cn("h-7 text-xs", kitchenActionBtn)}
                        >
                          <FastForward className="mr-1 h-3 w-3" />
                          Bump All
                        </Button>
                      )}
                      {canCompleteAll && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleCompleteAll(ticket.id)}
                          disabled={isPending}
                          className={cn("h-7 text-xs", kitchenActionBtn)}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Complete All
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
                            {item.orderItem.notes && (
                              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                Note: {item.orderItem.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            {item.status === "NEW" && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => bumpItem(item.id, "IN_PROGRESS")}
                                disabled={isPending}
                                className={cn("h-7 px-2.5 text-xs", kitchenActionBtn)}
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
                                className={cn("h-7 px-2.5 text-xs", kitchenActionBtn)}
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
                                className={cn("h-7 px-2.5 text-xs", kitchenActionBtn)}
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
