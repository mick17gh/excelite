"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";

interface SalesByDaypartProps {
  data: Array<{
    daypart: string;
    revenue: number;
    transactions: number;
  }>;
  title?: string;
  loading?: boolean;
}

export function SalesByDaypartChart({
  data,
  title = "Sales by Daypart",
  loading = false,
}: SalesByDaypartProps) {
  const { formatCurrency, formatCurrencyShort } = useCurrency();

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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="icon-blue rounded-lg p-1.5">
            <Clock className="h-4 w-4" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="daypart"
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
                  if (!active || !payload?.[0]) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-sm text-muted-foreground">
                        Revenue: {formatCurrency(item.revenue)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Transactions: {item.transactions.toLocaleString()}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="revenue"
                fill="url(#barGradient)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
