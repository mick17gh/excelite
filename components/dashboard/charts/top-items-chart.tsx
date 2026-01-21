"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Utensils } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";

interface MenuItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface TopItemsChartProps {
  topItems: MenuItem[];
  worstItems: MenuItem[];
  loading?: boolean;
}

export function TopItemsChart({
  topItems,
  worstItems,
  loading = false,
}: TopItemsChartProps) {
  const { formatCurrency, formatCurrencyShort } = useCurrency();

  if (loading) {
    return (
      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Menu Performance</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="h-[200px] w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const renderChart = (data: MenuItem[], color: string) => (
    <div className="h-[160px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data.slice(0, 5)}
          layout="vertical"
          margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrencyShort(value)}
            className="text-muted-foreground"
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            width={80}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const item = payload[0].payload as MenuItem;
              return (
                <div className="rounded-lg border bg-background p-2 shadow-lg text-xs">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground">
                    Revenue: {formatCurrency(item.revenue)}
                  </p>
                  <p className="text-muted-foreground">
                    Qty: {item.quantity.toLocaleString()}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
            {data.slice(0, 5).map((_, index) => (
              <Cell key={`cell-${index}`} fill={color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <Card className="chart-card rounded-xl">
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="icon-blue rounded-lg p-1.5">
            <Utensils className="h-4 w-4" />
          </div>
          Menu Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <Tabs defaultValue="top" className="w-full">
          <TabsList className="mb-2 h-7">
            <TabsTrigger value="top" className="text-xs h-6">Top Sellers</TabsTrigger>
            <TabsTrigger value="worst" className="text-xs h-6">Underperformers</TabsTrigger>
          </TabsList>
          <TabsContent value="top" className="mt-0">
            {renderChart(topItems, "#10b981")}
          </TabsContent>
          <TabsContent value="worst" className="mt-0">
            {renderChart(worstItems, "#f59e0b")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
