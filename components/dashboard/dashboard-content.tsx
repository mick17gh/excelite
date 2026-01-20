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
    profitMargin: number;
    transactionCount: number;
    averageTicket: number;
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
    <>
      {/* KPI Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3">
        <KPICard
          title="Total Revenue"
          value={kpiData.totalRevenue}
          change={kpiData.revenueGrowth}
          trend="up"
          format="currency"
          icon={DollarSign}
        />
        <KPICard
          title="Revenue Growth"
          value={kpiData.revenueGrowth}
          change={2.1}
          trend="up"
          format="percentage"
          icon={TrendingUp}
        />
        <KPICard
          title="COGS %"
          value={kpiData.cogsPercentage}
          change={-1.2}
          trend="down"
          format="percentage"
          icon={Percent}
        />
        <KPICard
          title="Profit Margin"
          value={kpiData.profitMargin}
          change={0.8}
          trend="up"
          format="percentage"
          icon={DollarSign}
        />
        <KPICard
          title="Transactions"
          value={kpiData.transactionCount}
          change={5.4}
          trend="up"
          format="number"
          icon={ShoppingCart}
        />
        <KPICard
          title="Avg. Ticket"
          value={kpiData.averageTicket}
          change={3.2}
          trend="up"
          format="currency"
          icon={Receipt}
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={revenueData} title="Revenue Trend (30 Days)" />
        </div>
        <div className="lg:col-span-1">
          <AlertsWidget alerts={activeAlerts} />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <SalesByDaypartChart data={salesByDaypart} />
        <SalesByChannelChart data={salesByChannel} />
        <TopItemsChart topItems={topMenuItems} worstItems={worstMenuItems} />
      </div>

      {/* Branch Performance Section */}
      <Card className="chart-card rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="icon-blue rounded-lg p-1.5">
              <Building2 className="h-4 w-4" />
            </div>
            Branch Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="chart">Chart View</TabsTrigger>
            </TabsList>
            <TabsContent value="table">
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
            <TabsContent value="chart">
              <BranchPerformanceChart data={branchChartData} title="" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Staff & Waste Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <StaffSummaryWidget data={staffSummary} />
        <Card className="chart-card rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
                <Trash2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              Waste Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold">
                  {formatCurrency(kpiData.wasteTotal)}
                </span>
                <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="mr-1 h-4 w-4 rotate-180" />
                  {Math.abs(kpiData.wasteChange)}% vs last period
                </span>
              </div>
              <div className="space-y-3">
                {branchPerformance.map((branch) => (
                  <div
                    key={branch.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{branch.name}</span>
                    <span className="font-medium">
                      {formatCurrency(branch.waste)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
