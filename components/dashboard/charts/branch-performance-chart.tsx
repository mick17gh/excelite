"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BranchPerformanceData {
  branchName: string;
  revenue: number;
  target: number;
  performance: number;
  status: "good" | "warning" | "critical";
}

interface BranchPerformanceChartProps {
  data: BranchPerformanceData[];
  title?: string;
  loading?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "good":
      return "hsl(var(--chart-3))";
    case "warning":
      return "hsl(var(--chart-4))";
    case "critical":
      return "hsl(var(--destructive))";
    default:
      return "hsl(var(--chart-1))";
  }
};

export function BranchPerformanceChart({
  data,
  title = "Branch Performance vs Target",
  loading = false,
}: BranchPerformanceChartProps) {
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <Card className="chart-card rounded-xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 80, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                horizontal={true}
                vertical={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                className="text-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="branchName"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                width={80}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const item = payload[0].payload as BranchPerformanceData;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="text-sm font-medium">{item.branchName}</p>
                      <p className="text-sm text-muted-foreground">
                        Revenue: {formatCurrency(item.revenue)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Target: {formatCurrency(item.target)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Performance: {item.performance.toFixed(1)}%
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
