"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  getPosTableContext,
  openTableSession,
  setTableBillRequested,
} from "@/lib/actions/tables";
import { toast } from "sonner";
import { Loader2, Receipt } from "lucide-react";

export type PosTableRow = {
  id: string;
  label: string;
  status: string;
  sectionName: string | null;
  capacity: number;
  openSession: {
    id: string;
    guestCount: number;
    openedByName: string;
  } | null;
};

interface TableServicePanelProps {
  branchId: string;
  activeSessionId: string | null;
  onSessionChange: (sessionId: string | null, tableLabel: string | null) => void;
}

const STATUS_DOT: Record<string, string> = {
  AVAILABLE: "bg-emerald-500",
  SEATED: "bg-blue-500",
  ORDERING: "bg-amber-500",
  BILL_REQUESTED: "bg-orange-500",
  DIRTY: "bg-slate-400",
  BLOCKED: "bg-red-500",
};

export function TableServicePanel({
  branchId,
  activeSessionId,
  onSessionChange,
}: TableServicePanelProps) {
  const [isPending, startTransition] = useTransition();
  const [tables, setTables] = useState<PosTableRow[]>([]);
  const [seatOpen, setSeatOpen] = useState(false);
  const [seatTableId, setSeatTableId] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(2);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!branchId) return;
    startTransition(async () => {
      const res = await getPosTableContext(branchId);
      if (!res.data?.enabled) return;
      setTables((res.data.tables as PosTableRow[]) ?? []);
    });
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectTable = (t: PosTableRow) => {
    if (t.status === "BLOCKED") {
      toast.error("Table is blocked");
      return;
    }
    if (t.openSession) {
      onSessionChange(t.openSession.id, t.label);
      setActiveLabel(t.label);
      return;
    }
    if (["AVAILABLE", "DIRTY"].includes(t.status)) {
      setSeatTableId(t.id);
      setGuestCount(2);
      setSeatOpen(true);
      return;
    }
    toast.message("Table is not available to seat");
  };

  const handleSeat = () => {
    if (!seatTableId) return;
    startTransition(async () => {
      const res = await openTableSession({
        tableId: seatTableId,
        guestCount,
      });
      if ("error" in res && res.error) {
        toast.error(res.error || "Could not seat table");
        return;
      }
      if (!("data" in res) || !res.data) {
        toast.error("Could not seat table");
        return;
      }
      toast.success(`Seated — ${res.data.tableLabel}`);
      onSessionChange(res.data.id, res.data.tableLabel);
      setActiveLabel(res.data.tableLabel);
      setSeatOpen(false);
      load();
    });
  };

  const requestBill = () => {
    const table = tables.find((t) => t.openSession?.id === activeSessionId);
    if (!table) return;
    startTransition(async () => {
      const res = await setTableBillRequested(table.id);
      if ("error" in res && res.error) toast.error(res.error);
      else {
        toast.success("Bill requested");
        load();
      }
    });
  };

  if (!branchId) return null;

  return (
    <div className="border-b bg-muted/30 px-3 py-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Tables
        </p>
        {activeSessionId && activeLabel && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Table {activeLabel}</Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={requestBill}
              disabled={isPending}
            >
              <Receipt className="h-3 w-3 mr-1" />
              Request bill
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => {
                onSessionChange(null, null);
                setActiveLabel(null);
              }}
            >
              Clear
            </Button>
          </div>
        )}
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-1">
          {tables.length === 0 && isPending && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {tables.map((t) => {
            const active = t.openSession?.id === activeSessionId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTable(t)}
                className={cn(
                  "shrink-0 rounded-md border px-3 py-2 text-left text-sm transition-colors min-w-[72px]",
                  active && "ring-2 ring-primary border-primary",
                  t.status === "BLOCKED" && "opacity-50 cursor-not-allowed",
                )}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <span
                    className={cn("h-2 w-2 rounded-full", STATUS_DOT[t.status] ?? "bg-muted")}
                  />
                  {t.label}
                </div>
                {t.openSession && (
                  <span className="text-[10px] text-muted-foreground">
                    {t.openSession.guestCount}p
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <Dialog open={seatOpen} onOpenChange={setSeatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Seat guests</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="covers">Number of covers</Label>
            <Input
              id="covers"
              type="number"
              min={1}
              max={99}
              value={guestCount}
              onChange={(e) => setGuestCount(Number(e.target.value) || 1)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeatOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSeat} disabled={isPending}>
              Open table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
