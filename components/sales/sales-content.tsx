"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Receipt,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { RevenueChart } from "@/components/dashboard/charts/revenue-chart";
import { SalesByChannelChart } from "@/components/dashboard/charts/sales-by-channel";
import { SalesByDaypartChart } from "@/components/dashboard/charts/sales-by-daypart";
import { TopItemsChart } from "@/components/dashboard/charts/top-items-chart";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { DatePresets } from "@/components/dashboard/date-presets";
import { BranchSelector } from "@/components/dashboard/branch-selector";
import { useCurrency } from "@/contexts/currency-context";
import { useBranchCurrency } from "@/hooks/use-branch-currency";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCSV, formatDateForFilename } from "@/lib/utils/export";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";

interface SalesContentProps {
  revenueData: Array<{ date: string; revenue: number; target: number }>;
  salesByChannel: Array<{ channel: string; revenue: number; percentage: number }>;
  salesByDaypart: Array<{ daypart: string; revenue: number; transactions: number }>;
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
  worstItems: Array<{ name: string; quantity: number; revenue: number }>;
  branches: Array<{ id: string; name: string; code: string; currency?: string | null }>;
  hourlyData: Array<{ hour: string; transactions: number; revenue: number }>;
}

export function SalesContent({
  revenueData,
  salesByChannel,
  salesByDaypart,
  topItems,
  worstItems,
  branches,
  hourlyData,
}: SalesContentProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedBranches, setSelectedBranches] = useState<string[]>(
    branches.map((b) => b.id)
  );

  const { formatCurrency } = useCurrency();
  
  // Set currency based on first selected branch
  const firstBranchId = selectedBranches.length > 0 ? selectedBranches[0] : null;
  useBranchCurrency(firstBranchId, branches);

  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const avgDailyRevenue = revenueData.length > 0 ? totalRevenue / revenueData.length : 0;
  const totalTransactions = salesByDaypart.reduce((sum, d) => sum + d.transactions, 0);
  const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <BranchSelector
            branches={branches}
            selectedBranches={selectedBranches}
            onSelectionChange={setSelectedBranches}
            className="w-full sm:w-[200px]"
          />
          <DateRangePicker
            date={dateRange}
            onDateChange={setDateRange}
            className="w-full sm:w-auto"
          />
          <DatePresets
            onSelect={setDateRange}
            currentRange={dateRange}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const exportData = revenueData.map((d) => ({
              Date: d.date,
              Revenue: d.revenue,
              Target: d.target,
            }));
            downloadCSV(exportData, `sales-report-${formatDateForFilename()}`);
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
                <div className="flex items-center mt-1 text-emerald-600">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span className="text-xs">8.5% vs last period</span>
                </div>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Daily Revenue</p>
                <p className="text-xl font-bold">{formatCurrency(avgDailyRevenue)}</p>
                <div className="flex items-center mt-1 text-emerald-600">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span className="text-xs">5.2% vs last period</span>
                </div>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-xl font-bold">{totalTransactions.toLocaleString()}</p>
                <div className="flex items-center mt-1 text-emerald-600">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span className="text-xs">12.3% vs last period</span>
                </div>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Ticket Size</p>
                <p className="text-xl font-bold">{formatCurrency(avgTicket)}</p>
                <div className="flex items-center mt-1 text-red-600">
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  <span className="text-xs">2.1% vs last period</span>
                </div>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hourly">Hourly Analysis</TabsTrigger>
          <TabsTrigger value="menu">Menu Performance</TabsTrigger>
          <TabsTrigger value="channels">Channel Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <RevenueChart data={revenueData} title="Revenue Trend" />
          <div className="grid gap-6 md:grid-cols-2">
            <SalesByDaypartChart data={salesByDaypart} />
            <SalesByChannelChart data={salesByChannel} />
          </div>
        </TabsContent>

        <TabsContent value="hourly" className="mt-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Hourly Transaction Analysis
              </CardTitle>
              <CardDescription>
                Transaction volume and revenue by hour of day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload) return null;
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-lg">
                            <p className="text-sm font-medium">{label}</p>
                            <p className="text-sm text-muted-foreground">
                              Transactions: {payload[0]?.value}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Revenue: {formatCurrency(payload[1]?.value as number)}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="transactions"
                      fill="hsl(var(--chart-1))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-[hsl(var(--chart-1))]" />
                  <span className="text-muted-foreground">Transactions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-0.5 w-6 bg-[hsl(var(--chart-3))]" />
                  <span className="text-muted-foreground">Revenue</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu" className="mt-6">
          <TopItemsChart topItems={topItems} worstItems={worstItems} />
        </TabsContent>

        <TabsContent value="channels" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <SalesByChannelChart data={salesByChannel} />
            <Card className="glass">
              <CardHeader>
                <CardTitle>Channel Performance Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesByChannel.map((channel) => (
                    <div key={channel.channel} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{channel.channel}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(channel.revenue)}</p>
                        <p className="text-xs text-muted-foreground">
                          {channel.percentage}% of total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
