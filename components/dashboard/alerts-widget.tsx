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
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
    case "high":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
    case "medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
  }
};

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case "critical":
      return (
        <Badge variant="destructive" className="text-xs">
          Critical
        </Badge>
      );
    case "high":
      return (
        <Badge className="bg-orange-500 text-white text-xs">High</Badge>
      );
    case "medium":
      return (
        <Badge className="bg-amber-500 text-white text-xs">Medium</Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-xs">
          Low
        </Badge>
      );
  }
};

export function AlertsWidget({ alerts, loading = false }: AlertsWidgetProps) {
  if (loading) {
    return (
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-16 w-full animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="chart-card rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30">
            <Bell className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          Active Alerts
          {alerts.length > 0 && (
            <Badge variant="secondary">{alerts.length}</Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/alerts">
            View all
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/30">
              <Bell className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="mt-3 text-sm font-medium">No active alerts</p>
            <p className="text-xs text-muted-foreground">
              All systems are operating normally
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-3 pr-4">
              {alerts.map((alert) => {
                const Icon = getAlertIcon(alert.type);
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex gap-3 rounded-lg border p-3 transition-smooth hover:bg-accent/50",
                      getSeverityColor(alert.severity)
                    )}
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-background/50">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {alert.title}
                        </p>
                        {getSeverityBadge(alert.severity)}
                      </div>
                      <p className="text-xs mt-0.5 line-clamp-2">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {alert.branchName && (
                          <span className="text-xs opacity-75">
                            {alert.branchName}
                          </span>
                        )}
                        <span className="text-xs opacity-60">
                          {formatDistanceToNow(alert.triggeredAt, {
                            addSuffix: true,
                          })}
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
