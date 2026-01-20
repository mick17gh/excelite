"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  format?: "currency" | "percentage" | "number";
  className?: string;
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  change,
  changeLabel = "vs last period",
  trend,
  icon: Icon,
  format = "number",
  className,
  loading = false,
}: KPICardProps) {
  const { formatCurrency } = useCurrency();

  const formatValue = (val: string | number) => {
    if (typeof val === "string") return val;
    if (val === undefined || val === null || isNaN(val)) return "—";
    switch (format) {
      case "currency":
        return formatCurrency(val);
      case "percentage":
        return `${val.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat("en-US").format(val);
    }
  };

  const getTrendColor = () => {
    if (!trend) return "text-muted-foreground";
    switch (trend) {
      case "up":
        return "text-emerald-600 dark:text-emerald-400";
      case "down":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;

  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "kpi-card rounded-xl group",
        className
      )}
    >
      <CardContent className="p-4  relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-xl font-bold tracking-tight text-foreground">
              {formatValue(value)}
            </p>
            {change !== undefined && (
              <div className={cn("flex items-center gap-1 text-xs sm:text-sm flex-wrap", getTrendColor())}>
                <TrendIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="font-semibold">
                  {Math.abs(change).toFixed(1)}%
                </span>
                <span className="text-muted-foreground text-xs hidden sm:inline">{changeLabel}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="icon-blue rounded-xl p-2.5 sm:p-3 flex-shrink-0 shadow-sm">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
