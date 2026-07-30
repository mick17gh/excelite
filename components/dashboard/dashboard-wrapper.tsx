"use client";

import { DashboardContent } from "@/components/dashboard/dashboard-content";

interface MenuItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface LowStockItem {
  name: string;
  quantity: number;
  reorderLevel: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
}

interface DashboardWrapperProps {
  revenueData: Array<{ date: string; revenue: number; target: number }>;
  topMenuItems: MenuItem[];
  worstMenuItems: MenuItem[];
  lowStockItems: LowStockItem[];
  recentOrders: RecentOrder[];
  selectedDateRange: {
    from: string;
    to: string;
  };
  dateRangeLabel: string;
  kpiData: {
    totalRevenue: number;
    revenueGrowth: number;
    transactionCount: number;
    transactionChange: number;
    averageTicket: number;
    averageTicketChange: number;
  };
}

export function DashboardWrapper({
  revenueData,
  topMenuItems,
  worstMenuItems,
  lowStockItems,
  recentOrders,
  selectedDateRange,
  dateRangeLabel,
  kpiData,
}: DashboardWrapperProps) {
  return (
    <DashboardContent
      revenueData={revenueData}
      topMenuItems={topMenuItems}
      worstMenuItems={worstMenuItems}
      lowStockItems={lowStockItems}
      recentOrders={recentOrders}
      selectedDateRange={selectedDateRange}
      dateRangeLabel={dateRangeLabel}
      kpiData={kpiData}
    />
  );
}
