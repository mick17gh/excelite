"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";

interface SalesByChannelProps {
  data: Array<{
    channel: string;
    revenue: number;
    percentage: number;
  }>;
  title?: string;
  loading?: boolean;
}

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
];

export function SalesByChannelChart({
  data,
  title = "Sales by Channel",
  loading = false,
}: SalesByChannelProps) {
  const { formatCurrency } = useCurrency();

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
            <PieChartIcon className="h-4 w-4" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="revenue"
                nameKey="channel"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="text-sm font-medium">{item.channel}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.revenue)} ({item.percentage}%)
                      </p>
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
