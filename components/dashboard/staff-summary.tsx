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
    switch (status) {
      case "adequate":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Adequate
          </Badge>
        );
      case "understaffed":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <AlertCircle className="mr-1 h-3 w-3" />
            Understaffed
          </Badge>
        );
      case "overstaffed":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Overstaffed
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
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
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Staff Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-2 w-full animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="chart-card rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30">
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          Staff Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((branch) => {
            const percentage = Math.min(
              (branch.onDuty / branch.required) * 100,
              100
            );
            return (
              <div key={branch.branchId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{branch.branchName}</span>
                  {getStatusBadge(branch.status)}
                </div>
                <div className="flex items-center gap-3">
                  <Progress
                    value={percentage}
                    className={cn("h-2 flex-1", getProgressColor(branch.status))}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {branch.onDuty}/{branch.required}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
