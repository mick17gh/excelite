"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  TrendingDown,
  Package,
  Users,
  TrendingUp,
  Bell,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Alert {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  branchName?: string;
  triggeredAt: Date;
}

interface AlertsWidgetProps {
  alerts: Alert[];
  loading?: boolean;
}

const getAlertIcon = (type: string) => {
  switch (type) {
    case "SALES_DROP":
      return TrendingDown;
    case "LOW_STOCK":
    case "OVERSTOCK":
      return Package;
    case "STAFF_SHORTAGE":
      return Users;
    case "EXCEPTIONAL_GROWTH":
      return TrendingUp;
    case "WASTE_SPIKE":
      return AlertTriangle;
    default:
      return Bell;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200/50 dark:border-red-800/50";
    case "high":
      return "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200/50 dark:border-orange-800/50";
    case "medium":
      return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50";
    default:
      return "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50";
  }
};

const getSeverityBadge = (severity: string) => {
  const baseClasses = "text-[10px] h-5 px-1.5";
  switch (severity) {
    case "critical":
      return <Badge variant="destructive" className={baseClasses}>Critical</Badge>;
    case "high":
      return <Badge className={cn(baseClasses, "bg-orange-500 text-white")}>High</Badge>;
    case "medium":
      return <Badge className={cn(baseClasses, "bg-amber-500 text-white")}>Medium</Badge>;
    default:
      return <Badge variant="secondary" className={baseClasses}>Low</Badge>;
  }
};

export function AlertsWidget({ alerts, loading = false }: AlertsWidgetProps) {
  if (loading) {
    return (
      <Card className="chart-card rounded-xl h-full">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Active Alerts</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="chart-card rounded-xl h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-linear-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30">
            <Bell className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          Alerts
          {alerts.length > 0 && (
            <Badge variant="secondary" className="h-5 text-[10px] px-1.5">{alerts.length}</Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
          <Link href="/dashboard/alerts">
            View all
            <ChevronRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 flex-1 min-h-0">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/30">
              <Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="mt-2 text-sm font-medium">No active alerts</p>
            <p className="text-xs text-muted-foreground">All systems normal</p>
          </div>
        ) : (
          <ScrollArea className="h-[240px]">
            <div className="space-y-2 pr-3">
              {alerts.map((alert) => {
                const Icon = getAlertIcon(alert.type);
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex gap-2 rounded-lg border p-2 transition-all hover:shadow-sm",
                      getSeverityColor(alert.severity)
                    )}
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background/60">
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-medium truncate leading-tight">
                          {alert.title}
                        </p>
                        {getSeverityBadge(alert.severity)}
                      </div>
                      <p className="text-[10px] mt-0.5 line-clamp-1 opacity-80">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {alert.branchName && (
                          <span className="text-[10px] opacity-70">{alert.branchName}</span>
                        )}
                        <span className="text-[10px] opacity-50">
                          {formatDistanceToNow(alert.triggeredAt, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
