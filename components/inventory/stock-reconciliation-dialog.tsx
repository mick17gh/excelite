"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2, Search, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import {
  getReconciliationCandidates,
  submitStockReconciliation,
  type ReconciliationCandidate,
} from "@/lib/actions/stock-reconciliation";
import { VARIANCE_REASONS } from "@/lib/inventory/reconciliation-constants";
import { useCurrency } from "@/contexts/currency-context";
import { EmptyState } from "@/components/ui/empty-state";

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface LineState {
  itemId: string;
  expectedQty: number;
  actualQty: string;
  wasteReason: string;
}

interface StockReconciliationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  branchId: string | null;
  canViewAllBranches: boolean;
}

export function StockReconciliationDialog({
  open,
  onOpenChange,
  branches,
  branchId: initialBranchId,
  canViewAllBranches,
}: StockReconciliationDialogProps) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId || "");
  const [dateKey, setDateKey] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [candidates, setCandidates] = useState<ReconciliationCandidate[]>([]);
  const [lines, setLines] = useState<LineState[]>([]);
  const [notes, setNotes] = useState("");
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submittedMeta, setSubmittedMeta] = useState<{
    submittedBy?: string | null;
    submittedAt?: Date;
  } | null>(null);

  const effectiveBranchId = canViewAllBranches ? selectedBranchId : initialBranchId;

  const loadCandidates = useCallback(async () => {
    if (!effectiveBranchId) return;
    setLoading(true);
    try {
      const result = await getReconciliationCandidates(effectiveBranchId, dateKey);
      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to load items");
        setCandidates([]);
        setLines([]);
        return;
      }

      setCandidates(result.data.candidates);
      setAlreadySubmitted(result.data.alreadySubmitted);
      setSubmittedMeta(
        result.data.alreadySubmitted
          ? {
              submittedBy: result.data.submittedBy,
              submittedAt: result.data.submittedAt,
            }
          : null
      );

      if (!result.data.alreadySubmitted) {
        setLines(
          result.data.candidates.map((c) => ({
            itemId: c.itemId,
            expectedQty: c.expectedQty,
            actualQty: String(c.expectedQty),
            wasteReason: "",
          }))
        );
      } else {
        setLines(
          result.data.candidates.map((c) => ({
            itemId: c.itemId,
            expectedQty: c.expectedQty,
            actualQty: String(c.actualQty ?? c.expectedQty),
            wasteReason: c.wasteReason || "",
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [effectiveBranchId, dateKey]);

  useEffect(() => {
    if (open) {
      setSelectedBranchId(initialBranchId || branches[0]?.id || "");
      setSearchQuery("");
      setCategoryFilter("all");
      setNotes("");
    }
  }, [open, initialBranchId, branches]);

  useEffect(() => {
    if (open && effectiveBranchId) {
      loadCandidates();
    }
  }, [open, effectiveBranchId, dateKey, loadCandidates]);

  const categories = useMemo(() => {
    return [...new Set(candidates.map((c) => c.category))].sort();
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [candidates, searchQuery, categoryFilter]);

  const lineMap = useMemo(() => new Map(lines.map((l) => [l.itemId, l])), [lines]);

  const summary = useMemo(() => {
    let shortageCost = 0;
    let shortageQty = 0;
    let overageQty = 0;

    for (const c of candidates) {
      const line = lineMap.get(c.itemId);
      if (!line || line.actualQty === "") continue;
      const actual = Number(line.actualQty);
      if (Number.isNaN(actual)) continue;
      const variance = line.expectedQty - actual;
      if (variance > 0) {
        shortageQty += variance;
        shortageCost += variance * c.unitCost;
      } else if (variance < 0) {
        overageQty += Math.abs(variance);
      }
    }

    return { shortageCost, shortageQty, overageQty };
  }, [candidates, lineMap]);

  const updateLine = (itemId: string, patch: Partial<LineState>) => {
    setLines((prev) =>
      prev.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l))
    );
  };

  const validateLines = (): string | null => {
    if (!candidates.length) return "No items to reconcile";
    for (const c of candidates) {
      const line = lineMap.get(c.itemId);
      if (!line || line.actualQty.trim() === "") {
        return `Enter actual count for ${c.name}`;
      }
      const actual = Number(line.actualQty);
      if (Number.isNaN(actual) || actual < 0) {
        return `Invalid actual count for ${c.name}`;
      }
      const variance = line.expectedQty - actual;
      if (Math.abs(variance) > 0.0001 && !line.wasteReason) {
        return `Select a variance reason for ${c.name}`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validateLines();
    if (error) {
      toast.error(error);
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSubmit = async () => {
    if (!effectiveBranchId) return;
    setSubmitting(true);
    try {
      const payload = {
        branchId: effectiveBranchId,
        dateKey,
        notes: notes.trim() || undefined,
        lines: candidates.map((c) => {
          const line = lineMap.get(c.itemId)!;
          return {
            itemId: c.itemId,
            expectedQty: line.expectedQty,
            actualQty: Number(line.actualQty),
            wasteReason: line.wasteReason || undefined,
          };
        }),
      };

      const result = await submitStockReconciliation(payload);
      if (!result.success) {
        toast.error(result.error || "Failed to submit reconciliation");
        if ((result as { stale?: boolean }).stale) {
          await loadCandidates();
        }
        return;
      }

      toast.success(
        `Reconciliation saved — ${result.data?.itemCount} items, variance cost ${formatCurrency(result.data?.totalVarianceCost || 0)}`
      );
      setConfirmOpen(false);
      onOpenChange(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(92vh,900px)] w-[min(96vw,1100px)] max-w-none flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Stock reconciliation
            </DialogTitle>
            <DialogDescription>
              Count physical stock for items that moved on the selected date. System stock is
              adjusted to match your actual counts.
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 space-y-3 border-b px-6 py-3">
            <div className="flex flex-wrap gap-3">
              {canViewAllBranches && (
                <div className="min-w-[180px] flex-1">
                  <Label className="text-xs">Branch</Label>
                  <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                    <SelectTrigger className="mt-1 h-8">
                      <SelectValue placeholder="Select branch" />
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
              )}
              <div>
                <Label className="text-xs">Business date</Label>
                <Input
                  type="date"
                  className="mt-1 h-8 w-[160px]"
                  value={dateKey}
                  onChange={(e) => setDateKey(e.target.value)}
                  disabled={alreadySubmitted}
                />
              </div>
              <div className="relative min-w-[160px] flex-1">
                <Label className="text-xs">Search</Label>
                <Search className="absolute bottom-2 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="mt-1 h-8 pl-8"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="min-w-[140px]">
                <Label className="text-xs">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="mt-1 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {alreadySubmitted && (
              <Badge variant="secondary" className="text-xs">
                Already reconciled
                {submittedMeta?.submittedBy ? ` by ${submittedMeta.submittedBy}` : ""}
              </Badge>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-3">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading items…
              </div>
            ) : !effectiveBranchId ? (
              <EmptyState
                title="Select a branch"
                description="Choose a branch to load reconciliation items."
              />
            ) : candidates.length === 0 ? (
              <EmptyState
                title="Nothing to reconcile"
                description="No stock movements were recorded for this date. Try another date or check back after sales, transfers, or waste entries."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-[90px]">System</TableHead>
                    <TableHead className="w-[100px]">Actual</TableHead>
                    <TableHead className="w-[90px]">Variance</TableHead>
                    <TableHead className="min-w-[180px]">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((c) => {
                    const line = lineMap.get(c.itemId);
                    const actual =
                      line?.actualQty !== "" && line?.actualQty !== undefined
                        ? Number(line.actualQty)
                        : NaN;
                    const variance =
                      !Number.isNaN(actual) && line
                        ? line.expectedQty - actual
                        : null;

                    return (
                      <TableRow key={c.itemId}>
                        <TableCell>
                          <div className="font-medium text-sm">{c.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.sku} · {c.category} · {c.unit}
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">{line?.expectedQty ?? c.expectedQty}</TableCell>
                        <TableCell>
                          {alreadySubmitted ? (
                            <span className="tabular-nums">{line?.actualQty}</span>
                          ) : (
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              className="h-8"
                              value={line?.actualQty ?? ""}
                              onChange={(e) =>
                                updateLine(c.itemId, { actualQty: e.target.value })
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell
                          className={`tabular-nums ${
                            variance !== null && Math.abs(variance) > 0.0001
                              ? variance > 0
                                ? "text-red-600"
                                : "text-blue-600"
                              : ""
                          }`}
                        >
                          {variance !== null && !Number.isNaN(variance)
                            ? variance.toFixed(2)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {alreadySubmitted ? (
                            <span className="text-xs">{line?.wasteReason || "—"}</span>
                          ) : variance !== null && Math.abs(variance) > 0.0001 ? (
                            <Select
                              value={line?.wasteReason || ""}
                              onValueChange={(v) =>
                                updateLine(c.itemId, { wasteReason: v })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select reason" />
                              </SelectTrigger>
                              <SelectContent>
                                {VARIANCE_REASONS.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {r}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {!alreadySubmitted && candidates.length > 0 && (
            <div className="shrink-0 space-y-3 border-t px-6 py-4">
              <div>
                <Label className="text-xs">Session notes (optional)</Label>
                <Textarea
                  className="mt-1 min-h-[60px] resize-none"
                  placeholder="End-of-shift notes…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>{candidates.length} items</span>
                <span>Shortage: {summary.shortageQty.toFixed(2)} units</span>
                <span>Overage: {summary.overageQty.toFixed(2)} units</span>
                <span className="font-medium text-foreground">
                  Est. loss: {formatCurrency(summary.shortageCost)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {!alreadySubmitted && candidates.length > 0 && (
              <Button onClick={handleSubmit} disabled={submitting || loading}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit reconciliation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm reconciliation</DialogTitle>
            <DialogDescription>
              This will update branch stock to your actual counts and record variance for{" "}
              {candidates.length} items. Estimated shortage cost:{" "}
              {formatCurrency(summary.shortageCost)}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
