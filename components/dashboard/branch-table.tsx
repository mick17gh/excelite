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
    switch (status) {
      case "good":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            On Track
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Warning
          </Badge>
        );
      case "critical":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Critical
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getTrendIcon = (performance: number) => {
    if (performance >= 100) {
      return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    } else if (performance >= 85) {
      return <Minus className="h-4 w-4 text-amber-500" />;
    } else {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead className="text-right">Performance</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-6 w-16 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-8 w-8 animate-pulse rounded bg-muted" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Branch</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Target</TableHead>
            <TableHead className="text-right">Performance</TableHead>
            <TableHead className="text-right">Transactions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.map((branch) => (
            <TableRow key={branch.id} className="group">
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{branch.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {branch.code}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(branch.revenue)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatCurrency(branch.target)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {getTrendIcon(branch.performance)}
                  <span
                    className={cn(
                      "font-medium",
                      branch.performance >= 100
                        ? "text-emerald-600 dark:text-emerald-400"
                        : branch.performance >= 85
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {branch.performance.toFixed(1)}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {branch.transactions.toLocaleString()}
              </TableCell>
              <TableCell>{getStatusBadge(branch.status)}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  asChild
                >
                  <Link href={`/dashboard/branches/${branch.id}`}>
                    <ArrowUpRight className="h-4 w-4" />
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
