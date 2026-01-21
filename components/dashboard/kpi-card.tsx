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
  const { formatCurrency, formatCurrencyShort } = useCurrency();

  // Smart format for currency - use abbreviated format for large values
  const formatValue = (val: string | number) => {
    if (typeof val === "string") return val;
    if (val === undefined || val === null || isNaN(val)) return "—";
    
    switch (format) {
      case "currency":
        // Use abbreviated format for values >= 10,000
        if (Math.abs(val) >= 10000) {
          return formatCurrencyShort(val);
        }
        return formatCurrency(val);
      case "percentage":
        return `${val.toFixed(1)}%`;
      default:
        // Abbreviate large numbers
        if (Math.abs(val) >= 1000000) {
          return `${(val / 1000000).toFixed(1)}M`;
        }
        if (Math.abs(val) >= 10000) {
          return `${(val / 1000).toFixed(1)}K`;
        }
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
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="h-5 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-12 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "kpi-card rounded-xl group hover:shadow-md transition-shadow overflow-hidden",
        className
      )}
    >
      <CardContent className="p-3 relative z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="text-[11px] font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-base font-bold tracking-tight text-foreground mt-0.5 truncate" title={String(value)}>
              {formatValue(value)}
            </p>
            {change !== undefined && (
              <div className={cn("flex items-center gap-1 text-[11px] mt-0.5", getTrendColor())}>
                <TrendIcon className="h-3 w-3 flex-shrink-0" />
                <span className="font-medium">
                  {Math.abs(change).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="icon-blue rounded-lg p-1.5 flex-shrink-0">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
