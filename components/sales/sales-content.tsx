"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
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
  Loader2,
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
import { useBranchRestrictions, filterBranchesForUser } from "@/hooks/use-branch-restrictions";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCSV, formatDateForFilename } from "@/lib/utils/export";
import { getSalesAnalyticsData } from "@/lib/actions/transactions";
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
  revenueData: initialRevenueData,
  salesByChannel: initialSalesByChannel,
  salesByDaypart: initialSalesByDaypart,
  topItems: initialTopItems,
  worstItems: initialWorstItems,
  branches,
  hourlyData: initialHourlyData,
}: SalesContentProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedBranches, setSelectedBranches] = useState<string[]>(
    branches.map((b) => b.id)
  );
  const [isPending, startTransition] = useTransition();

  // State for dynamic data
  const [revenueData, setRevenueData] = useState(initialRevenueData);
  const [salesByChannel, setSalesByChannel] = useState(initialSalesByChannel);
  const [salesByDaypart, setSalesByDaypart] = useState(initialSalesByDaypart);
  const [topItems, setTopItems] = useState(initialTopItems);
  const [worstItems, setWorstItems] = useState(initialWorstItems);
  const [hourlyData, setHourlyData] = useState(initialHourlyData);
  
  // State for comparison metrics
  const [revenueChange, setRevenueChange] = useState(0);
  const [transactionChange, setTransactionChange] = useState(0);
  const [avgTicketChange, setAvgTicketChange] = useState(0);
  const [avgDailyChange, setAvgDailyChange] = useState(0);

  const { formatCurrency } = useCurrency();
  const { canViewAllBranches, userBranchId, isLoading } = useBranchRestrictions();
  
  // Filter branches based on user permissions
  const availableBranches = filterBranchesForUser(branches, canViewAllBranches, userBranchId);
  
  // Auto-select user's branch if they're restricted
  useEffect(() => {
    if (!isLoading && !canViewAllBranches && userBranchId) {
      if (selectedBranches.length !== 1 || selectedBranches[0] !== userBranchId) {
        setSelectedBranches([userBranchId]);
      }
    }
  }, [isLoading, canViewAllBranches, userBranchId]);
  
  // Set currency based on first selected branch
  const firstBranchId = selectedBranches.length > 0 ? selectedBranches[0] : null;
  useBranchCurrency(firstBranchId, branches);

  // Refetch data when filters change
  const fetchData = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    startTransition(async () => {
      const result = await getSalesAnalyticsData(
        selectedBranches.length > 0 ? selectedBranches : undefined,
        dateRange.from,
        dateRange.to
      );
      
      if (result.success && result.data) {
        setRevenueData(result.data.revenueData);
        setSalesByChannel(result.data.salesByChannel);
        setSalesByDaypart(result.data.salesByDaypart);
        setTopItems(result.data.topItems);
        setWorstItems(result.data.worstItems);
        setHourlyData(result.data.hourlyData);
        // Update comparison metrics
        setRevenueChange(result.data.revenueChange || 0);
        setTransactionChange(result.data.transactionChange || 0);
        setAvgTicketChange(result.data.avgTicketChange || 0);
        setAvgDailyChange(result.data.avgDailyChange || 0);
      }
    });
  }, [dateRange, selectedBranches]);

  // Refetch when date range or selected branches change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const avgDailyRevenue = revenueData.length > 0 ? totalRevenue / revenueData.length : 0;
  const totalTransactions = salesByDaypart.reduce((sum, d) => sum + d.transactions, 0);
  const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <BranchSelector
            branches={availableBranches}
            selectedBranches={selectedBranches}
            onSelectionChange={setSelectedBranches}
            className="w-full sm:w-[200px]"
            restrictedToSingleBranch={!canViewAllBranches}
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
          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
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

      {/* Summary Cards - Compact */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Total Revenue</p>
                <p className="text-base font-bold mt-0.5 truncate">{formatCurrency(totalRevenue)}</p>
                {revenueChange !== 0 && (
                  <div className={`flex items-center text-[11px] mt-0.5 ${revenueChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {revenueChange >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                    <span>{Math.abs(revenueChange).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Avg Daily</p>
                <p className="text-base font-bold mt-0.5 truncate">{formatCurrency(avgDailyRevenue)}</p>
                {avgDailyChange !== 0 && (
                  <div className={`flex items-center text-[11px] mt-0.5 ${avgDailyChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {avgDailyChange >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                    <span>{Math.abs(avgDailyChange).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Transactions</p>
                <p className="text-base font-bold mt-0.5">{totalTransactions.toLocaleString()}</p>
                {transactionChange !== 0 && (
                  <div className={`flex items-center text-[11px] mt-0.5 ${transactionChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {transactionChange >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                    <span>{Math.abs(transactionChange).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Avg Ticket</p>
                <p className="text-base font-bold mt-0.5 truncate">{formatCurrency(avgTicket)}</p>
                {avgTicketChange !== 0 && (
                  <div className={`flex items-center text-[11px] mt-0.5 ${avgTicketChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {avgTicketChange >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                    <span>{Math.abs(avgTicketChange).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <Receipt className="h-4 w-4" />
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
                        if (!active || !payload || !payload.length) return null;
                        const transactions = payload[0]?.value || 0;
                        const revenue = payload[1]?.value || 0;
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-lg">
                            <p className="text-sm font-medium">{label}</p>
                            <p className="text-sm text-muted-foreground">
                              Transactions: {transactions}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Revenue: {formatCurrency(Number(revenue) || 0)}
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
