"use client";

import Link from "next/link";
import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  DollarSign,
  ShoppingCart,
  Receipt,
  Monitor,
  Package,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { KPICard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { RevenueChart } from "@/components/dashboard/charts/revenue-chart";
import { TopItemsChart } from "@/components/dashboard/charts/top-items-chart";
import { ContentCard } from "@/components/dashboard/content-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateRange } from "react-day-picker";
import {
  dashboardPrimaryButtonClass,
  orderStatusBadgeClass,
  stockStatusBadgeClass,
} from "@/components/dashboard/dashboard-theme";
import { cn } from "@/lib/utils";
import {
  DateRangePicker,
  normalizeInclusiveDateRange,
} from "@/components/dashboard/date-range-picker";
import { DatePresets } from "@/components/dashboard/date-presets";

interface DashboardContentProps {
  revenueData: Array<{ date: string; revenue: number; target: number }>;
  topMenuItems: Array<{ name: string; quantity: number; revenue: number }>;
  worstMenuItems: Array<{ name: string; quantity: number; revenue: number }>;
  lowStockItems?: Array<{ name: string; quantity: number; reorderLevel: number }>;
  recentOrders?: Array<{ id: string; orderNumber: string; total: number; status: string }>;
  selectedDateRange: {
    from: string;
    to: string;
  };
  dateRangeLabel: string;
  kpiData: {
    totalRevenue: number;
    revenueGrowth: number;
    transactionCount: number;
    transactionChange: number;
    averageTicket: number;
    averageTicketChange: number;
  };
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Package; title: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-muted/20">
      <div className="icon-accent flex h-8 w-8 items-center justify-center rounded-lg">
        <Icon className="h-4 w-4 text-[#16A34A]" />
      </div>
      <h3 className="text-base font-semibold text-[#222831]">{title}</h3>
    </div>
  );
}

export function DashboardContent({
  revenueData,
  topMenuItems,
  worstMenuItems,
  lowStockItems = [],
  recentOrders = [],
  selectedDateRange,
  dateRangeLabel,
  kpiData,
}: DashboardContentProps) {
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const dateRange = useMemo<DateRange | undefined>(() => {
    const from = new Date(selectedDateRange.from);
    const to = new Date(selectedDateRange.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return undefined;
    }
    return { from, to };
  }, [selectedDateRange.from, selectedDateRange.to]);

  const updateDateRange = (nextRange: DateRange | undefined) => {
    if (!nextRange?.from) return;
    const normalized = normalizeInclusiveDateRange(nextRange);
    if (!normalized?.from) return;
    const to = normalized.to ?? normalized.from;
    const fromKey = format(normalized.from, "yyyy-MM-dd");
    const toKey = format(to, "yyyy-MM-dd");

    // Skip no-op updates (same selected range).
    if (
      fromKey === (searchParams.get("from") ?? format(new Date(), "yyyy-MM-dd")) &&
      toKey === (searchParams.get("to") ?? format(new Date(), "yyyy-MM-dd"))
    ) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    // Store calendar dates, not ISO timestamps, to avoid timezone day-shift.
    params.set("from", fromKey);
    params.set("to", toKey);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard overview"
        description={`Dashboard data from ${dateRangeLabel}`}
        actions={
          <div className={cn("flex flex-wrap items-center justify-end gap-2", isPending && "opacity-70")}>
            <DateRangePicker date={dateRange} onDateChange={updateDateRange} />
            <DatePresets onSelect={updateDateRange} currentRange={dateRange} />
            {isPending && (
              <div className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating...
              </div>
            )}
            <Button asChild className={cn(dashboardPrimaryButtonClass, "cursor-pointer")}>
              <Link href="/pos" className="gap-2">
                <Monitor className="h-4 w-4" />
                Open POS
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Revenue"
          value={kpiData.totalRevenue}
          change={kpiData.revenueGrowth}
          trend={kpiData.revenueGrowth >= 0 ? "up" : "down"}
          format="currency"
          icon={DollarSign}
        />
        <KPICard
          title="Orders"
          value={kpiData.transactionCount}
          change={kpiData.transactionChange !== 0 ? kpiData.transactionChange : undefined}
          trend={kpiData.transactionChange >= 0 ? "up" : "down"}
          format="number"
          icon={ShoppingCart}
        />
        <KPICard
          title="Avg. Ticket"
          value={kpiData.averageTicket}
          change={kpiData.averageTicketChange !== 0 ? kpiData.averageTicketChange : undefined}
          trend={kpiData.averageTicketChange >= 0 ? "up" : "down"}
          format="currency"
          icon={Receipt}
        />
        <KPICard
          title="Products Sold"
          value={topMenuItems.reduce((sum, item) => sum + item.quantity, 0)}
          format="number"
          icon={Package}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={revenueData} title={`Revenue (${dateRangeLabel})`} />
        </div>
        <ContentCard padding="none">
          <SectionHeader icon={Package} title="Low Stock" />
          <div className="px-4 pb-4 pt-3">
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                All stock levels look good
              </p>
            ) : (
              <div className="space-y-1">
                {lowStockItems.slice(0, 5).map((item) => {
                  const status =
                    item.quantity <= item.reorderLevel * 0.5 ? "critical" : "low";
                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-sm py-2 px-2 rounded-lg hover:bg-[#22C55E]/5 transition-colors"
                    >
                      <span className="truncate pr-2">{item.name}</span>
                      <Badge variant="outline" className={stockStatusBadgeClass(status)}>
                        {item.quantity} left
                      </Badge>
                    </div>
                  );
                })}
                <Button
                  asChild
                  variant="link"
                  className="px-2 h-auto text-[#16A34A] hover:text-[#15803D] cursor-pointer"
                >
                  <Link href="/dashboard/inventory">View inventory</Link>
                </Button>
              </div>
            )}
          </div>
        </ContentCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TopItemsChart topItems={topMenuItems} worstItems={worstMenuItems} />

        <ContentCard padding="none">
          <SectionHeader icon={ShoppingCart} title="Recent Orders" />
          <div className="px-4 pb-4 pt-3">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No orders in this date range
              </p>
            ) : (
              <div className="space-y-1">
                {recentOrders.slice(0, 6).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between text-sm py-2 px-2 rounded-lg hover:bg-[#22C55E]/5 transition-colors"
                  >
                    <span className="font-medium">#{order.orderNumber}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={orderStatusBadgeClass(order.status)}>
                        {order.status.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                      <span className="font-medium text-[#222831]">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                ))}
                <Button
                  asChild
                  variant="link"
                  className="px-2 h-auto text-[#16A34A] hover:text-[#15803D] cursor-pointer"
                >
                  <Link href="/dashboard/orders">View all orders</Link>
                </Button>
              </div>
            )}
          </div>
        </ContentCard>
      </div>
    </div>
  );
}
