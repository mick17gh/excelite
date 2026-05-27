"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getFloorBoardData,
  listOpenSessions,
  listBranchWaiters,
  reassignTableSession,
  transferTableSession,
  mergeTableSessions,
  splitTableSession,
  clearTable,
} from "@/lib/actions/tables";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@/lib/generated/prisma/client";
import { Loader2, Users, Clock, LayoutGrid, Sparkles, CreditCard } from "lucide-react";
import { SessionCheckoutDialog } from "@/components/tables/session-checkout-dialog";
import { useCurrency } from "@/contexts/currency-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30",
  SEATED: "border-blue-300 bg-blue-50 dark:bg-blue-950/30",
  ORDERING: "border-amber-300 bg-amber-50 dark:bg-amber-950/30",
  BILL_REQUESTED: "border-orange-400 bg-orange-50 dark:bg-orange-950/30",
  DIRTY: "border-slate-300 bg-slate-50 dark:bg-slate-900/40",
  BLOCKED: "border-red-300 bg-red-50 dark:bg-red-950/30",
};

interface FloorBoardContentProps {
  branches: { id: string; name: string }[];
  defaultBranchId?: string;
  userRole?: Role;
}

export function FloorBoardContent({
  branches,
  defaultBranchId,
  userRole = "STAFF",
}: FloorBoardContentProps) {
  const canClearTables =
    hasPermission(userRole, "tables:manage") ||
    hasPermission(userRole, "tables:assign");
  const canManageTables = hasPermission(userRole, "tables:manage");
  const canPayTab = hasPermission(userRole, "transactions:create");
  const { formatCurrency } = useCurrency();
  const [branchId, setBranchId] = useState(defaultBranchId ?? branches[0]?.id ?? "");
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [openSessions, setOpenSessions] = useState<
    Array<{
      id: string;
      tableId: string;
      tableLabel: string;
      sectionName: string | null;
      openedByUserId: string;
      openedByName: string;
      guestCount: number;
      openedAt: string;
      unpaidOrders: number;
      unpaidTotal: number;
    }>
  >([]);
  const [waiters, setWaiters] = useState<Array<{ id: string; name: string }>>([]);
  const [targetSessionId, setTargetSessionId] = useState<string>("");
  const [targetWaiterId, setTargetWaiterId] = useState<string>("");
  const [transferToTableId, setTransferToTableId] = useState<string>("");
  const [mergeFromSessionId, setMergeFromSessionId] = useState<string>("");
  const [splitToTableId, setSplitToTableId] = useState<string>("");
  const [splitCovers, setSplitCovers] = useState<string>("1");
  const [data, setData] = useState<{
    openTables: number;
    coversOnFloor: number;
    avgSeatedMinutes: number;
    statusCounts: Record<string, number>;
    tables: Array<{
      id: string;
      label: string;
      status: string;
      sectionName: string | null;
      capacity: number;
      posX: number | null;
      posY: number | null;
      session: {
        id: string;
        guestCount: number;
        openedByName: string;
        openedAt: string;
      } | null;
    }>;
  } | null>(null);
  const selectedSession = openSessions.find((s) => s.id === targetSessionId) ?? null;
  const sessionByTableId = new Map(openSessions.map((s) => [s.tableId, s]));
  const parsedSplitCovers = Number(splitCovers);
  const splitCoverInvalid =
    !Number.isFinite(parsedSplitCovers) ||
    parsedSplitCovers < 1 ||
    (selectedSession ? parsedSplitCovers >= selectedSession.guestCount : false);

  const load = useCallback(() => {
    if (!branchId) return;
    startTransition(async () => {
      const res = await getFloorBoardData(branchId);
      if ("error" in res && res.error) return;
      if ("data" in res) setData(res.data ?? null);
      const sessionsRes = await listOpenSessions(branchId);
      if ("data" in sessionsRes && sessionsRes.data) {
        setOpenSessions(sessionsRes.data);
      }
      if (canManageTables) {
        const waitersRes = await listBranchWaiters(branchId);
        if ("data" in waitersRes && waitersRes.data) {
          setWaiters(waitersRes.data);
        }
      } else {
        setWaiters([]);
      }
    });
  }, [branchId, canManageTables]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live floor board</h1>
          <p className="text-muted-foreground text-sm">
            Open tables, covers, and status for the current shift
          </p>
        </div>
        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending && !data && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Open tables
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                {data.openTables}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Covers on floor
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {data.coversOnFloor}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg seated time
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                {data.avgSeatedMinutes}m
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Available
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {data.statusCounts.AVAILABLE}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {data.tables.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "rounded-lg border-2 p-3 min-h-[88px] flex flex-col justify-between",
                  STATUS_STYLES[t.status] ?? "border-border",
                )}
                style={
                  t.posX != null && t.posY != null
                    ? { gridColumn: undefined }
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="font-bold">{t.label}</span>
                  <Badge variant="outline" className="text-[10px] px-1">
                    {t.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {t.sectionName && (
                  <p className="text-[10px] text-muted-foreground truncate">{t.sectionName}</p>
                )}
                {t.session ? (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs">
                      {t.session.guestCount} covers · {t.session.openedByName}
                    </p>
                    {(() => {
                      const sess = sessionByTableId.get(t.id);
                      if (sess && sess.unpaidOrders > 0) {
                        return (
                          <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                            {sess.unpaidOrders} check{sess.unpaidOrders !== 1 ? "s" : ""} ·{" "}
                            {formatCurrency(sess.unpaidTotal)}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Cap {t.capacity}</p>
                )}
                {t.status === "DIRTY" && canClearTables && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-2 h-7 w-full text-xs"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await clearTable(t.id);
                        if ("error" in res && res.error) {
                          toast.error(res.error);
                          return;
                        }
                        toast.success(`Table ${t.label} cleared`);
                        load();
                      })
                    }
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Clear table
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Host stand actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSession && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Selected: Table {selectedSession.tableLabel} · {selectedSession.guestCount}{" "}
                    covers · {selectedSession.openedByName} · Unpaid{" "}
                    {selectedSession.unpaidOrders} check
                    {selectedSession.unpaidOrders !== 1 ? "s" : ""} (
                    {formatCurrency(selectedSession.unpaidTotal)})
                  </p>
                  {canPayTab && selectedSession.unpaidOrders > 0 && (
                    <Button
                      size="sm"
                      onClick={() => setPayDialogOpen(true)}
                      disabled={isPending}
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Pay tab
                    </Button>
                  )}
                </div>
              )}
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                <Select value={targetSessionId} onValueChange={setTargetSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select open session" />
                  </SelectTrigger>
                  <SelectContent>
                    {openSessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.tableLabel} · {s.openedByName} · {s.guestCount} covers
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {canManageTables && (
                  <>
                <Select value={targetWaiterId} onValueChange={setTargetWaiterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Reassign waiter" />
                  </SelectTrigger>
                  <SelectContent>
                    {waiters.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  disabled={!targetSessionId || !targetWaiterId || isPending}
                  onClick={() =>
                    startTransition(async () => {
                      if (
                        !window.confirm("Reassign this session to the selected waiter?")
                      ) {
                        return;
                      }
                      const res = await reassignTableSession({
                        sessionId: targetSessionId,
                        waiterUserId: targetWaiterId,
                      });
                      if ("error" in res && res.error) {
                        toast.error(res.error);
                        return;
                      }
                      toast.success("Waiter reassigned");
                      load();
                    })
                  }
                >
                  Reassign
                </Button>

                <Select value={transferToTableId} onValueChange={setTransferToTableId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Transfer to table" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.tables.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label} ({t.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  disabled={!targetSessionId || !transferToTableId || isPending}
                  onClick={() =>
                    startTransition(async () => {
                      if (
                        !window.confirm(
                          "Transfer this session to the selected destination table?",
                        )
                      ) {
                        return;
                      }
                      const res = await transferTableSession({
                        sessionId: targetSessionId,
                        toTableId: transferToTableId,
                      });
                      if ("error" in res && res.error) {
                        toast.error(res.error);
                        return;
                      }
                      toast.success("Session transferred");
                      load();
                    })
                  }
                >
                  Transfer
                </Button>

                <Select value={mergeFromSessionId} onValueChange={setMergeFromSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Merge source session" />
                  </SelectTrigger>
                  <SelectContent>
                    {openSessions
                      .filter((s) => s.id !== targetSessionId)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.tableLabel} · {s.guestCount} covers
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  disabled={!targetSessionId || !mergeFromSessionId || isPending}
                  onClick={() =>
                    startTransition(async () => {
                      if (
                        !window.confirm(
                          "Merge source session into selected target session? Source table will be freed.",
                        )
                      ) {
                        return;
                      }
                      const res = await mergeTableSessions({
                        sourceSessionId: mergeFromSessionId,
                        targetSessionId: targetSessionId,
                      });
                      if ("error" in res && res.error) {
                        toast.error(res.error);
                        return;
                      }
                      toast.success("Sessions merged");
                      load();
                    })
                  }
                >
                  Merge checks
                </Button>

                <Select value={splitToTableId} onValueChange={setSplitToTableId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Split to table" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.tables.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label} ({t.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={splitCovers}
                  onChange={(e) => setSplitCovers(e.target.value)}
                  type="number"
                  min={1}
                  max={selectedSession ? Math.max(1, selectedSession.guestCount - 1) : undefined}
                  placeholder="Covers to move"
                />

                <Button
                  variant="outline"
                  disabled={!targetSessionId || !splitToTableId || splitCoverInvalid || isPending}
                  onClick={() =>
                    startTransition(async () => {
                      if (
                        !window.confirm(
                          `Split ${parsedSplitCovers} covers from selected session to destination table?`,
                        )
                      ) {
                        return;
                      }
                      const res = await splitTableSession({
                        sourceSessionId: targetSessionId,
                        destinationTableId: splitToTableId,
                        movedCovers: parsedSplitCovers,
                      });
                      if ("error" in res && res.error) {
                        toast.error(res.error);
                        return;
                      }
                      toast.success("Session split");
                      load();
                    })
                  }
                >
                  Split covers
                </Button>
                  </>
                )}
              </div>
              {canManageTables && selectedSession && (
                <p className="text-xs text-muted-foreground">
                  Split covers must be between 1 and {Math.max(1, selectedSession.guestCount - 1)}.
                </p>
              )}
              {!canManageTables && canPayTab && (
                <p className="text-xs text-muted-foreground">
                  Select an open table session above, then use Pay tab to settle all unpaid checks.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <SessionCheckoutDialog
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        sessionId={targetSessionId || null}
        onSuccess={load}
      />
    </div>
  );
}
