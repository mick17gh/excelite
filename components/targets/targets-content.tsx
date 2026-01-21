"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { DateRange } from "react-day-picker";
import {
  Plus,
  Edit,
  Trash2,
  Target,
  TrendingUp,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createTarget, updateTarget, deleteTarget } from "@/lib/actions/targets";
import { useCurrency } from "@/contexts/currency-context";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Target {
  id: string;
  branchId: string;
  branch: { id: string; name: string; code: string };
  targetType: string;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  targetValue: number;
  currentValue: number;
  isActive: boolean;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface TargetsContentProps {
  targets: Target[];
  branches: Branch[];
}

const targetTypes = [
  { value: "REVENUE", label: "Revenue", description: "Total sales revenue" },
  { value: "TRANSACTIONS", label: "Transactions", description: "Number of transactions" },
  { value: "AVERAGE_TICKET", label: "Average Ticket", description: "Average transaction value" },
  { value: "CUSTOMERS", label: "Customers", description: "Number of customers served" },
];

const periods = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

export function TargetsContent({ targets: initialTargets, branches }: TargetsContentProps) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    branchId: "",
    targetType: "REVENUE",
    period: "MONTHLY",
    dateRange: undefined as DateRange | undefined,
    targetValue: "",
  });

  const handleCreate = async () => {
    if (!formData.branchId || !formData.dateRange?.from || !formData.dateRange?.to || !formData.targetValue) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createTarget({
        branchId: formData.branchId,
        targetType: formData.targetType,
        period: formData.period,
        periodStart: formData.dateRange.from,
        periodEnd: formData.dateRange.to,
        targetValue: parseFloat(formData.targetValue),
      });

      if (result.success) {
        toast.success("Target created successfully");
        setIsCreateOpen(false);
        setFormData({
          branchId: "",
          targetType: "REVENUE",
          period: "MONTHLY",
          dateRange: undefined,
          targetValue: "",
        });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create target");
      }
    } catch (error) {
      console.error("Error creating target:", error);
      toast.error("Failed to create target");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (target: Target) => {
    setEditingTarget(target);
    setFormData({
      branchId: target.branchId,
      targetType: target.targetType,
      period: target.period,
      dateRange: {
        from: new Date(target.periodStart),
        to: new Date(target.periodEnd),
      },
      targetValue: target.targetValue.toString(),
    });
  };

  const handleUpdate = async () => {
    if (!editingTarget || !formData.targetValue) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateTarget({
        id: editingTarget.id,
        targetValue: parseFloat(formData.targetValue),
        periodStart: formData.dateRange?.from,
        periodEnd: formData.dateRange?.to,
      });

      if (result.success) {
        toast.success("Target updated successfully");
        setEditingTarget(null);
        setFormData({
          branchId: "",
          targetType: "REVENUE",
          period: "MONTHLY",
          dateRange: undefined,
          targetValue: "",
        });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update target");
      }
    } catch (error) {
      console.error("Error updating target:", error);
      toast.error("Failed to update target");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, branchName: string) => {
    if (!confirm(`Are you sure you want to delete the target for ${branchName}?`)) {
      return;
    }

    const result = await deleteTarget(id);
    if (result.success) {
      toast.success("Target deleted successfully");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete target");
    }
  };

  const getProgress = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-emerald-500";
    if (progress >= 85) return "bg-amber-500";
    return "bg-red-500";
  };

  const activeTargets = initialTargets.filter((t) => t.isActive).length;

  return (
    <div className="space-y-4">
      {/* Summary Cards - Compact */}
      <div className="grid gap-2 sm:gap-3 grid-cols-3">
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Total Targets</p>
                <p className="text-base font-bold mt-0.5">{initialTargets.length}</p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <Target className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Active</p>
                <p className="text-base font-bold mt-0.5 text-emerald-600">{activeTargets}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Branches</p>
                <p className="text-base font-bold mt-0.5">
                  {new Set(initialTargets.map((t) => t.branchId)).size}
                </p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-blue-100 dark:bg-blue-900/30">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex-1" />
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Target
        </Button>
      </div>

      {/* Targets Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Branch Targets</CardTitle>
          <CardDescription>
            Set and manage performance targets for branches. Targets are used for comparison in reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {initialTargets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold mb-1">No Targets</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Create targets to track and compare branch performance
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Target
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Target Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialTargets.map((target) => {
                  const progress = getProgress(target.currentValue, target.targetValue);
                  return (
                    <TableRow key={target.id}>
                      <TableCell className="font-medium">{target.branch.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {targetTypes.find((t) => t.value === target.targetType)?.label || target.targetType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {periods.find((p) => p.value === target.period)?.label || target.period}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(target.periodStart), "MMM dd")} - {format(new Date(target.periodEnd), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {target.targetType === "REVENUE" || target.targetType === "AVERAGE_TICKET"
                          ? formatCurrency(target.targetValue)
                          : target.targetValue.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {target.targetType === "REVENUE" || target.targetType === "AVERAGE_TICKET"
                          ? formatCurrency(target.currentValue)
                          : target.currentValue.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full transition-all", getProgressColor(progress))}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-12 text-right">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(target)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(target.id, target.branch.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Target Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Target</DialogTitle>
            <DialogDescription>
              Set a performance target for a branch. This will be used for comparison in reports.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branch">
                Branch <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.branchId}
                onValueChange={(value) => setFormData({ ...formData, branchId: value })}
              >
                <SelectTrigger id="branch">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetType">
                Target Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.targetType}
                onValueChange={(value) => setFormData({ ...formData, targetType: value })}
              >
                <SelectTrigger id="targetType" className="h-auto py-2">
                  <SelectValue>
                    {formData.targetType ? (
                      <div className="flex flex-col items-start">
                        <span className="font-medium">
                          {targetTypes.find((t) => t.value === formData.targetType)?.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {targetTypes.find((t) => t.value === formData.targetType)?.description}
                        </span>
                      </div>
                    ) : (
                      "Select target type"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {targetTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period">
                  Period <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.period}
                  onValueChange={(value) => setFormData({ ...formData, period: value })}
                >
                  <SelectTrigger id="period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetValue">
                  Target Value <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="targetValue"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Date Range <span className="text-destructive">*</span>
              </Label>
              <DateRangePicker
                date={formData.dateRange}
                onDateChange={(range) => setFormData({ ...formData, dateRange: range })}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                isSubmitting ||
                !formData.branchId ||
                !formData.dateRange?.from ||
                !formData.dateRange?.to ||
                !formData.targetValue
              }
            >
              {isSubmitting ? "Creating..." : "Create Target"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Target Dialog */}
      <Dialog open={!!editingTarget} onOpenChange={(open) => !open && setEditingTarget(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Target</DialogTitle>
            <DialogDescription>
              Update the target value or date range
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Branch</Label>
              <Input
                value={editingTarget?.branch.name || ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Target Type</Label>
              <Input
                value={targetTypes.find((t) => t.value === editingTarget?.targetType)?.label || editingTarget?.targetType || ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-targetValue">
                  Target Value <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-targetValue"
                  type="number"
                  step="0.01"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Current Value</Label>
                <Input
                  value={
                    editingTarget?.targetType === "REVENUE" || editingTarget?.targetType === "AVERAGE_TICKET"
                      ? formatCurrency(editingTarget.currentValue)
                      : editingTarget?.currentValue.toLocaleString() || "0"
                  }
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <DateRangePicker
                date={formData.dateRange}
                onDateChange={(range) => setFormData({ ...formData, dateRange: range })}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingTarget(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting || !formData.targetValue}>
              {isSubmitting ? "Updating..." : "Update Target"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
