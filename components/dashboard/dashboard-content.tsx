"use client";

import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Percent,
  Trash2,
  Receipt,
  Building2,
} from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";

import { KPICard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/charts/revenue-chart";
import { SalesByChannelChart } from "@/components/dashboard/charts/sales-by-channel";
import { SalesByDaypartChart } from "@/components/dashboard/charts/sales-by-daypart";
import { BranchPerformanceChart } from "@/components/dashboard/charts/branch-performance-chart";
import { TopItemsChart } from "@/components/dashboard/charts/top-items-chart";
import { BranchTable } from "@/components/dashboard/branch-table";
import { AlertsWidget } from "@/components/dashboard/alerts-widget";
import { StaffSummaryWidget } from "@/components/dashboard/staff-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardContentProps {
  revenueData: Array<{ date: string; revenue: number; target: number }>;
  salesByChannel: Array<{ channel: string; revenue: number; percentage: number }>;
  salesByDaypart: Array<{ daypart: string; revenue: number; transactions: number }>;
  branchPerformance: Array<{
    id: string;
    name: string;
    code: string;
    revenue: number;
    target: number;
    performance: number;
    transactions: number;
    waste: number;
    status: "good" | "warning" | "critical";
  }>;
  topMenuItems: Array<{ name: string; quantity: number; revenue: number }>;
  worstMenuItems: Array<{ name: string; quantity: number; revenue: number }>;
  activeAlerts: Array<{
    id: string;
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    message: string;
    branchName?: string;
    triggeredAt: Date;
  }>;
  staffSummary: Array<{
    branchId: string;
    branchName: string;
    totalStaff: number;
    onDuty: number;
    required: number;
    status: "adequate" | "understaffed" | "overstaffed";
  }>;
  kpiData: {
    totalRevenue: number;
    revenueGrowth: number;
    cogsPercentage: number;
    cogsChange: number;
    profitMargin: number;
    profitMarginChange: number;
    transactionCount: number;
    transactionChange: number;
    averageTicket: number;
    averageTicketChange: number;
    wasteTotal: number;
    wasteChange: number;
  };
}

export function DashboardContent({
  revenueData,
  salesByChannel,
  salesByDaypart,
  branchPerformance,
  topMenuItems,
  worstMenuItems,
  activeAlerts,
  staffSummary,
  kpiData,
}: DashboardContentProps) {
  const { formatCurrency } = useCurrency();
  
  const branchChartData = branchPerformance.map((b) => ({
    branchName: b.name,
    revenue: b.revenue,
    target: b.target,
    performance: b.performance,
    status: b.status,
  }));

  return (
    <div className="space-y-4">
      {/* KPI Cards - Compact Grid */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KPICard
          title="Total Revenue"
          value={kpiData.totalRevenue}
          change={kpiData.revenueGrowth}
          trend="up"
          format="currency"
          icon={DollarSign}
        />
        <KPICard
          title="Growth"
          value={kpiData.revenueGrowth}
          change={kpiData.revenueGrowth !== 0 ? kpiData.revenueGrowth : undefined}
          trend={kpiData.revenueGrowth >= 0 ? "up" : "down"}
          format="percentage"
          icon={TrendingUp}
        />
        <KPICard
          title="COGS %"
          value={kpiData.cogsPercentage}
          change={kpiData.cogsChange !== 0 ? kpiData.cogsChange : undefined}
          trend={kpiData.cogsChange <= 0 ? "up" : "down"}
          format="percentage"
          icon={Percent}
        />
        <KPICard
          title="Profit Margin"
          value={kpiData.profitMargin}
          change={kpiData.profitMarginChange !== 0 ? kpiData.profitMarginChange : undefined}
          trend={kpiData.profitMarginChange >= 0 ? "up" : "down"}
          format="percentage"
          icon={DollarSign}
        />
        <KPICard
          title="Transactions"
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
      </div>

      {/* Main Content - Revenue & Alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={revenueData} title="Revenue Trend (30 Days)" />
        </div>
        <div className="lg:col-span-1">
          <AlertsWidget alerts={activeAlerts} />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SalesByDaypartChart data={salesByDaypart} />
        <SalesByChannelChart data={salesByChannel} />
        <TopItemsChart topItems={topMenuItems} worstItems={worstMenuItems} />
      </div>

      {/* Branch Performance Section */}
      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="icon-blue rounded-lg p-1.5">
              <Building2 className="h-4 w-4" />
            </div>
            Branch Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="mb-3 h-8">
              <TabsTrigger value="table" className="text-xs h-7">Table</TabsTrigger>
              <TabsTrigger value="chart" className="text-xs h-7">Chart</TabsTrigger>
            </TabsList>
            <TabsContent value="table" className="mt-0">
              <BranchTable
                branches={branchPerformance.map((b) => ({
                  id: b.id,
                  name: b.name,
                  code: b.code,
                  revenue: b.revenue,
                  target: b.target,
                  performance: b.performance,
                  transactions: b.transactions,
                  waste: b.waste,
                  status: b.status,
                }))}
              />
            </TabsContent>
            <TabsContent value="chart" className="mt-0">
              <BranchPerformanceChart data={branchChartData} title="" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Staff & Waste Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <StaffSummaryWidget data={staffSummary} />
        <Card className="chart-card rounded-xl">
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
                <Trash2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              Waste Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">
                  {formatCurrency(kpiData.wasteTotal)}
                </span>
                <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="mr-1 h-3 w-3 rotate-180" />
                  {Math.abs(kpiData.wasteChange)}% vs last period
                </span>
              </div>
              <div className="space-y-2">
                {branchPerformance.map((branch) => (
                  <div
                    key={branch.id}
                    className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0"
                  >
                    <span className="text-muted-foreground text-xs">{branch.name}</span>
                    <span className="font-medium text-xs">
                      {formatCurrency(branch.waste)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
