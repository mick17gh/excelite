"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";

interface RevenueChartProps {
  data: Array<{
    date: string;
    revenue: number;
    target?: number;
  }>;
  title?: string;
  loading?: boolean;
}

export function RevenueChart({
  data,
  title = "Revenue Trend",
  loading = false,
}: RevenueChartProps) {
  const { formatCurrency, formatCurrencyShort, currency } = useCurrency();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="chart-card rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <div className="icon-blue rounded-lg p-1.5">
            <TrendingUp className="h-4 w-4" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] sm:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="strokeRevenue" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrencyShort(value)}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload) return null;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="text-sm font-medium">{label}</p>
                      {payload.map((entry, index) => (
                        <p
                          key={index}
                          className="text-sm"
                          style={{ color: entry.color }}
                        >
                          {entry.name}: {formatCurrency(entry.value as number)}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="url(#strokeRevenue)"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
              {data[0]?.target !== undefined && (
                <Area
                  type="monotone"
                  dataKey="target"
                  name="Target"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fillOpacity={1}
                  fill="url(#colorTarget)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
