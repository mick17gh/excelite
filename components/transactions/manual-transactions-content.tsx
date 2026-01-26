"use client";

import { useState, useEffect } from "react";
import { addDays, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { createManualEntryBatchWithLines } from "@/lib/actions/manual-pos";
import { SalesChannel } from "@/lib/generated/prisma/client";
import { useBranchRestrictions, filterBranchesForUser } from "@/hooks/use-branch-restrictions";

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface ManualLineForm {
  id: string;
  date: string;
  channel: SalesChannel;
  totalRevenue: string;
  transactionCount: string;
}

interface ManualTransactionsContentProps {
  branches: Branch[];
}

export function ManualTransactionsContent({ branches }: ManualTransactionsContentProps) {
  const { canViewAllBranches, userBranchId, isLoading: authLoading } = useBranchRestrictions();
  
  // Filter branches based on user permissions
  const availableBranches = filterBranchesForUser(branches, canViewAllBranches, userBranchId);
  
  const [branchId, setBranchId] = useState<string>("");
  const [periodStart, setPeriodStart] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState<string>(
    format(addDays(new Date(), 6), "yyyy-MM-dd")
  );

  // Auto-select user's branch if they're restricted, or first available branch
  useEffect(() => {
    if (!authLoading && availableBranches.length > 0 && !branchId) {
      if (!canViewAllBranches && userBranchId) {
        // Restricted users get their assigned branch
        setBranchId(userBranchId);
      } else {
        // Managers and admins get the first available branch
        setBranchId(availableBranches[0].id);
      }
    }
  }, [authLoading, canViewAllBranches, userBranchId, availableBranches, branchId]);
  const [lines, setLines] = useState<ManualLineForm[]>([
    {
      id: "line-1",
      date: format(new Date(), "yyyy-MM-dd"),
      channel: "DINE_IN",
      totalRevenue: "",
      transactionCount: "",
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addLine = () => {
    const nextIndex = lines.length + 1;
    setLines([
      ...lines,
      {
        id: `line-${nextIndex}`,
        date: periodStart,
        channel: "DINE_IN",
        totalRevenue: "",
        transactionCount: "",
      },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length === 1) return;
    setLines(lines.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, field: keyof ManualLineForm, value: string) => {
    setLines(
      lines.map((line) =>
        line.id === id
          ? {
              ...line,
              [field]: value,
            }
          : line
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!branchId) {
      toast.error("Please select a branch");
      return;
    }

    const parsedLines = lines
      .map((line) => {
        if (!line.date || !line.totalRevenue || !line.transactionCount) {
          return null;
        }
        const revenue = Number(line.totalRevenue);
        const txCount = Number(line.transactionCount);
        if (Number.isNaN(revenue) || Number.isNaN(txCount)) {
          return null;
        }
        return {
          date: new Date(line.date),
          channel: line.channel,
          totalRevenue: revenue,
          transactionCount: txCount,
        };
      })
      .filter(Boolean) as Array<{
      date: Date;
      channel: SalesChannel;
      totalRevenue: number;
      transactionCount: number;
    }>;

    if (parsedLines.length === 0) {
      toast.error("Please add at least one valid entry line");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createManualEntryBatchWithLines({
        branchId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        lines: parsedLines,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to save manual POS entries");
        return;
      }

      toast.success("Manual POS entries saved successfully");
      setLines([
        {
          id: "line-1",
          date: periodStart,
          channel: "DINE_IN",
          totalRevenue: "",
          transactionCount: "",
        },
      ]);
    } catch (error) {
      console.error(error);
      toast.error("Unexpected error while saving entries");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalRevenue = lines.reduce((sum, line) => {
    const value = Number(line.totalRevenue || 0);
    return sum + (Number.isNaN(value) ? 0 : value);
  }, 0);

  const totalTransactions = lines.reduce((sum, line) => {
    const value = Number(line.transactionCount || 0);
    return sum + (Number.isNaN(value) ? 0 : value);
  }, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Manual POS Summary
          </CardTitle>
          <CardDescription>
            Capture summarized sales figures from your existing POS system. These
            values will feed into dashboards and reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {availableBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Period Start</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Period End</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>
                Total Revenue:{" "}
                <Badge variant="outline">
                  {totalRevenue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Badge>
              </span>
              <span>
                Transactions:{" "}
                <Badge variant="outline">{totalTransactions}</Badge>
              </span>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" />
              Add Line
            </Button>
          </div>

          <div className="mt-4 rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Date</TableHead>
                  <TableHead className="w-[160px]">Channel</TableHead>
                  <TableHead>Total Revenue</TableHead>
                  <TableHead>Transaction Count</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Input
                        type="date"
                        value={line.date}
                        onChange={(e) =>
                          updateLine(line.id, "date", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={line.channel}
                        onValueChange={(value) =>
                          updateLine(line.id, "channel", value as SalesChannel)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DINE_IN">Dine-in</SelectItem>
                          <SelectItem value="TAKEOUT">Takeout</SelectItem>
                          <SelectItem value="DELIVERY">Delivery</SelectItem>
                          <SelectItem value="APP">App</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.totalRevenue}
                        onChange={(e) =>
                          updateLine(line.id, "totalRevenue", e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={line.transactionCount}
                        onChange={(e) =>
                          updateLine(line.id, "transactionCount", e.target.value)
                        }
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(line.id)}
                        className="text-destructive"
                        disabled={lines.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Manual Entries"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

