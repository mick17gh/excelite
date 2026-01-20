"use client";

import { useState, useEffect, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { useCurrency } from "@/contexts/currency-context";
import { useBranchCurrency } from "@/hooks/use-branch-currency";
import { CurrencyCode } from "@/lib/currency";

interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  currency?: string;
  isActive: boolean;
}

interface BranchPerformance {
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

interface RevenueDataPoint {
  date: string;
  revenue: number;
  target: number;
}

interface SalesChannel {
  channel: string;
  revenue: number;
  percentage: number;
}

interface SalesDaypart {
  daypart: string;
  revenue: number;
  transactions: number;
}

interface MenuItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface Alert {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  message: string;
  branchName: string;
  triggeredAt: Date;
}

interface StaffSummary {
  branchId: string;
  branchName: string;
  totalStaff: number;
  onDuty: number;
  required: number;
  status: "adequate" | "understaffed" | "overstaffed";
}

interface KPIData {
  totalRevenue: number;
  revenueGrowth: number;
  cogsPercentage: number;
  profitMargin: number;
  transactionCount: number;
  averageTicket: number;
  wasteTotal: number;
  wasteChange: number;
}

interface DashboardWrapperProps {
  branches: Branch[];
  revenueData: RevenueDataPoint[];
  salesByChannel: SalesChannel[];
  salesByDaypart: SalesDaypart[];
  branchPerformance: BranchPerformance[];
  topMenuItems: MenuItem[];
  worstMenuItems: MenuItem[];
  activeAlerts: Alert[];
  staffSummary: StaffSummary[];
  kpiData: KPIData;
}

export function DashboardWrapper({
  branches,
  revenueData,
  salesByChannel,
  salesByDaypart,
  branchPerformance,
  topMenuItems,
  worstMenuItems,
  activeAlerts,
  staffSummary,
  kpiData,
}: DashboardWrapperProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedBranches, setSelectedBranches] = useState<string[]>(
    branches.map((b) => b.id)
  );

  // Set currency based on first selected branch
  const firstBranchId = selectedBranches.length > 0 ? selectedBranches[0] : null;
  useBranchCurrency(firstBranchId, branches);

  // Filter data based on selected branches
  const filteredBranchPerformance = useMemo(() => {
    if (selectedBranches.length === branches.length) {
      return branchPerformance;
    }
    return branchPerformance.filter((b) => selectedBranches.includes(b.id));
  }, [selectedBranches, branchPerformance, branches.length]);

  const filteredStaffSummary = useMemo(() => {
    if (selectedBranches.length === branches.length) {
      return staffSummary;
    }
    return staffSummary.filter((s) => selectedBranches.includes(s.branchId));
  }, [selectedBranches, staffSummary, branches.length]);

  const filteredAlerts = useMemo(() => {
    if (selectedBranches.length === branches.length) {
      return activeAlerts;
    }
    const selectedBranchNames = branches
      .filter((b) => selectedBranches.includes(b.id))
      .map((b) => b.name);
    return activeAlerts.filter((a) => selectedBranchNames.includes(a.branchName));
  }, [selectedBranches, activeAlerts, branches]);

  // Calculate filtered KPI data
  const filteredKpiData = useMemo(() => {
    if (selectedBranches.length === 0) {
      return {
        totalRevenue: 0,
        revenueGrowth: 0,
        cogsPercentage: 0,
        profitMargin: 0,
        transactionCount: 0,
        averageTicket: 0,
        wasteTotal: 0,
        wasteChange: 0,
      };
    }

    if (selectedBranches.length === branches.length) {
      return kpiData;
    }

    const filtered = filteredBranchPerformance;
    const totalRevenue = filtered.reduce((sum, b) => sum + b.revenue, 0);
    const totalTransactions = filtered.reduce((sum, b) => sum + b.transactions, 0);
    const totalWaste = filtered.reduce((sum, b) => sum + b.waste, 0);
    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    return {
      totalRevenue,
      revenueGrowth: kpiData.revenueGrowth,
      cogsPercentage: kpiData.cogsPercentage,
      profitMargin: kpiData.profitMargin,
      transactionCount: totalTransactions,
      averageTicket,
      wasteTotal: totalWaste,
      wasteChange: kpiData.wasteChange,
    };
  }, [selectedBranches, filteredBranchPerformance, kpiData, branches.length]);

  // Adjust revenue data based on selection (proportional scaling)
  const filteredRevenueData = useMemo(() => {
    if (selectedBranches.length === branches.length) {
      return revenueData;
    }
    const ratio = selectedBranches.length / branches.length;
    return revenueData.map((d) => ({
      ...d,
      revenue: Math.round(d.revenue * ratio),
      target: Math.round(d.target * ratio),
    }));
  }, [selectedBranches, revenueData, branches.length]);

  // Adjust sales data proportionally
  const filteredSalesByChannel = useMemo(() => {
    if (selectedBranches.length === branches.length) {
      return salesByChannel;
    }
    const ratio = selectedBranches.length / branches.length;
    return salesByChannel.map((s) => ({
      ...s,
      revenue: Math.round(s.revenue * ratio),
    }));
  }, [selectedBranches, salesByChannel, branches.length]);

  const filteredSalesByDaypart = useMemo(() => {
    if (selectedBranches.length === branches.length) {
      return salesByDaypart;
    }
    const ratio = selectedBranches.length / branches.length;
    return salesByDaypart.map((s) => ({
      ...s,
      revenue: Math.round(s.revenue * ratio),
      transactions: Math.round(s.transactions * ratio),
    }));
  }, [selectedBranches, salesByDaypart, branches.length]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            Executive Dashboard
          </h1>
          <p className="text-muted-foreground">
            Real-time overview of your restaurant operations
          </p>
        </div>
        <DashboardFilters
          branches={branches}
          selectedBranches={selectedBranches}
          onBranchChange={setSelectedBranches}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      <DashboardContent
        revenueData={filteredRevenueData}
        salesByChannel={filteredSalesByChannel}
        salesByDaypart={filteredSalesByDaypart}
        branchPerformance={filteredBranchPerformance}
        topMenuItems={topMenuItems}
        worstMenuItems={worstMenuItems}
        activeAlerts={filteredAlerts}
        staffSummary={filteredStaffSummary}
        kpiData={filteredKpiData}
      />
    </div>
  );
}
