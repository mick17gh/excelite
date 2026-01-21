"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, AlertCircle, CheckCircle2 } from "lucide-react";

interface StaffSummaryData {
  branchId: string;
  branchName: string;
  totalStaff: number;
  onDuty: number;
  required: number;
  status: "adequate" | "understaffed" | "overstaffed";
}

interface StaffSummaryProps {
  data: StaffSummaryData[];
  loading?: boolean;
}

export function StaffSummaryWidget({ data, loading = false }: StaffSummaryProps) {
  const getStatusBadge = (status: string) => {
    const baseClasses = "text-[10px] h-5 px-1.5";
    switch (status) {
      case "adequate":
        return (
          <Badge className={cn(baseClasses, "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400")}>
            <CheckCircle2 className="mr-0.5 h-3 w-3" />
            OK
          </Badge>
        );
      case "understaffed":
        return (
          <Badge className={cn(baseClasses, "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>
            <AlertCircle className="mr-0.5 h-3 w-3" />
            Low
          </Badge>
        );
      case "overstaffed":
        return (
          <Badge className={cn(baseClasses, "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400")}>
            High
          </Badge>
        );
      default:
        return <Badge variant="secondary" className={baseClasses}>-</Badge>;
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "adequate":
        return "bg-emerald-500";
      case "understaffed":
        return "bg-red-500";
      case "overstaffed":
        return "bg-amber-500";
      default:
        return "bg-primary";
    }
  };

  if (loading) {
    return (
      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Staff Overview</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="h-1.5 w-full animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="chart-card rounded-xl">
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30">
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          Staff Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="space-y-3">
          {data.map((branch) => {
            const percentage = Math.min(
              (branch.onDuty / branch.required) * 100,
              100
            );
            return (
              <div key={branch.branchId} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{branch.branchName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {branch.onDuty}/{branch.required}
                    </span>
                    {getStatusBadge(branch.status)}
                  </div>
                </div>
                <Progress
                  value={percentage}
                  className={cn("h-1.5", getProgressColor(branch.status))}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
