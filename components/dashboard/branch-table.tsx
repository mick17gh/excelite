"use client";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import Link from "next/link";
import { useCurrency } from "@/contexts/currency-context";

interface BranchData {
  id: string;
  name: string;
  code: string;
  revenue: number;
  target: number;
  performance: number;
  transactions: number;
  waste: number;
  status: "good" | "warning" | "critical";
}

interface BranchTableProps {
  branches: BranchData[];
  loading?: boolean;
}

export function BranchTable({ branches, loading = false }: BranchTableProps) {
  const { formatCurrency } = useCurrency();

  const getStatusBadge = (status: string) => {
    const baseClasses = "text-[10px] h-5 px-1.5";
    switch (status) {
      case "good":
        return (
          <Badge className={cn(baseClasses, "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400")}>
            On Track
          </Badge>
        );
      case "warning":
        return (
          <Badge className={cn(baseClasses, "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400")}>
            Warning
          </Badge>
        );
      case "critical":
        return (
          <Badge className={cn(baseClasses, "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>
            Critical
          </Badge>
        );
      default:
        return <Badge variant="secondary" className={baseClasses}>Unknown</Badge>;
    }
  };

  const getTrendIcon = (performance: number) => {
    if (performance >= 100) {
      return <TrendingUp className="h-3 w-3 text-emerald-500" />;
    } else if (performance >= 85) {
      return <Minus className="h-3 w-3 text-amber-500" />;
    } else {
      return <TrendingDown className="h-3 w-3 text-red-500" />;
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Branch</TableHead>
              <TableHead className="text-right text-xs">Revenue</TableHead>
              <TableHead className="text-right text-xs">Target</TableHead>
              <TableHead className="text-right text-xs">Perf.</TableHead>
              <TableHead className="text-right text-xs">Trans.</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><div className="h-3 w-20 animate-pulse rounded bg-muted" /></TableCell>
                <TableCell><div className="ml-auto h-3 w-14 animate-pulse rounded bg-muted" /></TableCell>
                <TableCell><div className="ml-auto h-3 w-14 animate-pulse rounded bg-muted" /></TableCell>
                <TableCell><div className="ml-auto h-3 w-10 animate-pulse rounded bg-muted" /></TableCell>
                <TableCell><div className="ml-auto h-3 w-10 animate-pulse rounded bg-muted" /></TableCell>
                <TableCell><div className="h-5 w-14 animate-pulse rounded bg-muted" /></TableCell>
                <TableCell><div className="h-6 w-6 animate-pulse rounded bg-muted" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs font-medium">Branch</TableHead>
            <TableHead className="text-right text-xs font-medium">Revenue</TableHead>
            <TableHead className="text-right text-xs font-medium">Target</TableHead>
            <TableHead className="text-right text-xs font-medium">Perf.</TableHead>
            <TableHead className="text-right text-xs font-medium">Trans.</TableHead>
            <TableHead className="text-xs font-medium">Status</TableHead>
            <TableHead className="w-8"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.map((branch) => (
            <TableRow key={branch.id} className="group">
              <TableCell className="py-2">
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{branch.name}</span>
                  <span className="text-[10px] text-muted-foreground">{branch.code}</span>
                </div>
              </TableCell>
              <TableCell className="text-right text-xs font-medium py-2">
                {formatCurrency(branch.revenue)}
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground py-2">
                {formatCurrency(branch.target)}
              </TableCell>
              <TableCell className="text-right py-2">
                <div className="flex items-center justify-end gap-1">
                  {getTrendIcon(branch.performance)}
                  <span
                    className={cn(
                      "text-xs font-medium",
                      branch.performance >= 100
                        ? "text-emerald-600 dark:text-emerald-400"
                        : branch.performance >= 85
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {branch.performance.toFixed(0)}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right text-xs py-2">
                {branch.transactions.toLocaleString()}
              </TableCell>
              <TableCell className="py-2">{getStatusBadge(branch.status)}</TableCell>
              <TableCell className="py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  asChild
                >
                  <Link href={`/dashboard/branches/${branch.id}`}>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
