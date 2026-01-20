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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
      <Card>
        <CardHeader>
          <CardTitle>Menu Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const renderChart = (data: MenuItem[], color: string) => (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 100, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrencyShort(value)}
            className="text-muted-foreground"
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            width={100}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const item = payload[0].payload as MenuItem;
              return (
                <div className="rounded-lg border bg-background p-3 shadow-lg">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Revenue: {formatCurrency(item.revenue)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Quantity: {item.quantity.toLocaleString()}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <Card className="chart-card rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="icon-blue rounded-lg p-1.5">
            <Utensils className="h-4 w-4" />
          </div>
          Menu Performance
        </CardTitle>
        <CardDescription>Top and worst performing menu items</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="top" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="top">Top Sellers</TabsTrigger>
            <TabsTrigger value="worst">Underperformers</TabsTrigger>
          </TabsList>
          <TabsContent value="top">
            {renderChart(topItems, "#10b981")}
          </TabsContent>
          <TabsContent value="worst">
            {renderChart(worstItems, "#f59e0b")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
