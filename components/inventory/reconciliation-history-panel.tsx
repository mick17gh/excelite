"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { getReconciliationHistory } from "@/lib/actions/stock-reconciliation";
import { useCurrency } from "@/contexts/currency-context";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDisplayDate } from "@/lib/utils/date-display";

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface ReconciliationHistoryPanelProps {
  branches: Branch[];
  branchId: string | null;
  canViewAllBranches: boolean;
}

type HistorySession = {
  id: string;
  dateKey: string;
  reconciliationDate: Date;
  itemCount: number;
  totalShortageQty: number;
  totalOverageQty: number;
  totalVarianceCost: number;
  salesTotalSnapshot: number | null;
  submittedBy: string | null;
  notes: string | null;
  createdAt: Date;
  lines: Array<{
    itemName: string;
    sku: string;
    category: string;
    unit: string;
    expectedQty: number;
    actualQty: number;
    variance: number;
    wasteReason: string | null;
    lossValue: number;
  }>;
};

export function ReconciliationHistoryPanel({
  branches,
  branchId: defaultBranchId,
  canViewAllBranches,
}: ReconciliationHistoryPanelProps) {
  const { formatCurrency } = useCurrency();
  const [selectedBranchId, setSelectedBranchId] = useState(defaultBranchId || branches[0]?.id || "");
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const effectiveBranchId = canViewAllBranches ? selectedBranchId : defaultBranchId;

  const loadHistory = useCallback(async () => {
    if (!effectiveBranchId) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await getReconciliationHistory(effectiveBranchId);
      if (!result.success) {
        toast.error(result.error || "Failed to load history");
        setSessions([]);
        return;
      }
      setSessions((result.data?.sessions as HistorySession[]) || []);
    } finally {
      setLoading(false);
    }
  }, [effectiveBranchId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <Card className="glass">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Reconciliation history</CardTitle>
        {canViewAllBranches && (
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="h-8 w-[200px]">
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
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No reconciliations yet"
            description="Completed stock reconciliations for this branch will appear here."
          />
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => {
              const expanded = expandedId === session.id;
              return (
                <div key={session.id} className="rounded-lg border">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
                    onClick={() => setExpandedId(expanded ? null : session.id)}
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {formatDisplayDate(session.reconciliationDate)}
                        </span>
                        <Badge variant="secondary">{session.itemCount} items</Badge>
                        {session.totalVarianceCost > 0 && (
                          <Badge variant="outline" className="text-red-600">
                            Loss {formatCurrency(session.totalVarianceCost)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {session.submittedBy ? `By ${session.submittedBy}` : "Submitted"} ·{" "}
                        Short {session.totalShortageQty.toFixed(1)} / Over{" "}
                        {session.totalOverageQty.toFixed(1)}
                        {session.salesTotalSnapshot != null &&
                          ` · Sales ${formatCurrency(session.salesTotalSnapshot)}`}
                      </p>
                    </div>
                  </button>
                  {expanded && (
                    <div className="border-t px-2 pb-3">
                      {session.notes && (
                        <p className="px-2 py-2 text-sm text-muted-foreground">{session.notes}</p>
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Expected</TableHead>
                            <TableHead>Actual</TableHead>
                            <TableHead>Variance</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead className="text-right">Loss</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {session.lines.map((line, idx) => (
                            <TableRow key={`${session.id}-${idx}`}>
                              <TableCell>
                                <div className="text-sm font-medium">{line.itemName}</div>
                                <div className="text-xs text-muted-foreground">{line.sku}</div>
                              </TableCell>
                              <TableCell>{line.expectedQty}</TableCell>
                              <TableCell>{line.actualQty}</TableCell>
                              <TableCell
                                className={
                                  Math.abs(line.variance) > 0.0001
                                    ? line.variance > 0
                                      ? "text-red-600"
                                      : "text-blue-600"
                                    : ""
                                }
                              >
                                {line.variance.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-xs">{line.wasteReason || "—"}</TableCell>
                              <TableCell className="text-right">
                                {line.lossValue > 0 ? formatCurrency(line.lossValue) : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={loadHistory} disabled={loading}>
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
