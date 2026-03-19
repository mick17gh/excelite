"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Search,
  ArrowUpRight,
  Target,

} from "lucide-react";
import Link from "next/link";
import { BranchPerformanceChart } from "@/components/dashboard/charts/branch-performance-chart";
import { AddBranchForm } from "@/components/branches/branch-forms";
import { Plus } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { useFirstBranchCurrency } from "@/hooks/use-branch-currency";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2, Download } from "lucide-react";
import { downloadCSV, formatDateForFilename } from "@/lib/utils/export";

interface Branch {
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

interface BranchListItem {
  id: string;
  name: string;
  code: string;
  city: string;
  isActive: boolean;
  currency?: string | null;
}

interface BranchesContentProps {
  branches: Branch[];
  branchList: BranchListItem[];
  currentCount: number;
  maxBranches: number;
}

export function BranchesContent({ branches, branchList, currentCount, maxBranches }: BranchesContentProps) {
  const { formatCurrency } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [_selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);

  // Set currency based on first branch
  useFirstBranchCurrency(branchList);

  const filteredBranches = branches.filter((branch) => {
    const matchesSearch =
      branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || branch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = branches.reduce((sum, b) => sum + b.revenue, 0);
  const _totalTarget = branches.reduce((sum, b) => sum + b.target, 0);
  const totalTransactions = branches.reduce((sum, b) => sum + b.transactions, 0);
  const avgPerformance =
    branches.reduce((sum, b) => sum + b.performance, 0) / branches.length;

  
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

  const branchChartData = branches.map((b) => ({
    branchName: b.name,
    revenue: b.revenue,
    target: b.target,
    performance: b.performance,
    status: b.status,
  }));

  const { formatCurrencyShort } = useCurrency();

  return (
    <div className="space-y-4">
      {/* Summary Cards - Compact */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Total Revenue</p>
                <p className="text-base font-bold mt-0.5 truncate">
                  {totalRevenue >= 10000 ? formatCurrencyShort(totalRevenue) : formatCurrency(totalRevenue)}
                </p>
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
                <p className="text-[11px] font-medium text-muted-foreground truncate">Avg Performance</p>
                <p className="text-base font-bold mt-0.5">{avgPerformance.toFixed(1)}%</p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <Target className="h-4 w-4" />
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
                <p className="text-[11px] font-medium text-muted-foreground truncate">Branches</p>
                <p className="text-base font-bold mt-0.5">{branches.length}</p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search branches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="good">On Track</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const exportData = filteredBranches.map((b) => ({
                Name: b.name,
                Code: b.code,
                Revenue: b.revenue,
                Target: b.target,
                Performance: `${b.performance.toFixed(1)}%`,
                Transactions: b.transactions,
                Status: b.status,
              }));
              downloadCSV(exportData, `branches-${formatDateForFilename()}`);
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            onClick={() => setIsAddBranchOpen(true)}
            disabled={currentCount >= maxBranches}
            title={currentCount >= maxBranches ? `Branch limit reached (${currentCount}/${maxBranches}). Upgrade your plan.` : undefined}
          >
            <Plus className="mr-2 h-4 w-4" />
            {currentCount >= maxBranches ? `Limit Reached (${currentCount}/${maxBranches})` : "Add Branch"}
          </Button>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="grid" className="w-full">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="chart">Chart View</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-6">
          {filteredBranches.length === 0 ? (
            <Card className="glass">
              <CardContent className="p-0">
                <EmptyState
                  icon={<Building2 className="h-8 w-8 text-muted-foreground" />}
                  title="No branches found"
                  description="Try adjusting your search or filters to find branches."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBranches.map((branch) => (
              <Card
                key={branch.id}
                className="glass transition-smooth hover:card-shadow-hover cursor-pointer"
                onClick={() => setSelectedBranch(branch)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{branch.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{branch.code}</p>
                    </div>
                    {getStatusBadge(branch.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Revenue</span>
                      <span className="font-medium">{formatCurrency(branch.revenue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Target</span>
                      <span className="font-medium">{formatCurrency(branch.target)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Performance</span>
                      <span
                        className={`flex items-center font-medium ${
                          branch.performance >= 100
                            ? "text-emerald-600"
                            : branch.performance >= 85
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        {branch.performance >= 100 ? (
                          <TrendingUp className="mr-1 h-4 w-4" />
                        ) : (
                          <TrendingDown className="mr-1 h-4 w-4" />
                        )}
                        {branch.performance.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Transactions</span>
                      <span className="font-medium">{branch.transactions.toLocaleString()}</span>
                    </div>
                    <div className="pt-2">
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <Link href={`/dashboard/branches/${branch.id}`}>
                          View Details
                          <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chart" className="mt-6">
          <BranchPerformanceChart data={branchChartData} />
        </TabsContent>
      </Tabs>

      {/* Add Branch Form */}
      <AddBranchForm open={isAddBranchOpen} onOpenChange={setIsAddBranchOpen} />
    </div>
  );
}
