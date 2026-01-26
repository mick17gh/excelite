import { DashboardWrapper } from "@/components/dashboard/dashboard-wrapper";
import { getBranches, getBranchPerformance } from "@/lib/actions/branches";
import { getStaffSummary } from "@/lib/actions/staff";
import { getActiveAlerts } from "@/lib/actions/alerts";
import {
  getRevenueData,
  getSalesByChannel,
  getSalesByDaypart,
  getTopMenuItems,
  getKPIData,
} from "@/lib/actions/transactions";

export const metadata = {
  title: "Executive Dashboard | Dinelytix",
  description: "CEO-level visibility into multi-branch restaurant operations",
};

export default async function ExecutiveDashboard() {
  const [
    branchesResult,
    branchPerformanceResult,
    revenueDataResult,
    salesByChannelResult,
    salesByDaypartResult,
    topMenuItemsResult,
    alertsResult,
    staffSummaryResult,
    kpiDataResult,
  ] = await Promise.all([
    getBranches(),
    getBranchPerformance(),
    getRevenueData(),
    getSalesByChannel(),
    getSalesByDaypart(),
    getTopMenuItems(),
    getActiveAlerts(),
    getStaffSummary(),
    getKPIData(),
  ]);

  const branches = branchesResult.data || [];
  const branchPerformance = branchPerformanceResult.data || [];
  const revenueData = revenueDataResult.data || [];
  const salesByChannel = salesByChannelResult.data || [];
  const salesByDaypart = salesByDaypartResult.data || [];
  const menuItemsData = topMenuItemsResult.data || { top: [], worst: [] };
  const topMenuItems = menuItemsData.top || [];
  const worstMenuItems = menuItemsData.worst || [];
  const activeAlerts = (alertsResult.data || []).map(alert => ({
    ...alert,
    branchName: alert.branchName || "Unknown",
  }));
  const staffSummary = staffSummaryResult.data || {
    totalStaff: 0,
    onDuty: 0,
    lateArrivals: 0,
    absences: 0,
  };
  const kpiData = kpiDataResult.data || {
    totalRevenue: 0,
    revenueGrowth: 0,
    cogsPercentage: 0,
    cogsChange: 0,
    profitMargin: 0,
    profitMarginChange: 0,
    transactionCount: 0,
    transactionChange: 0,
    averageTicket: 0,
    averageTicketChange: 0,
    wasteTotal: 0,
    wasteChange: 0,
  };

  return (
    <DashboardWrapper
      branches={branches}
      revenueData={revenueData}
      salesByChannel={salesByChannel}
      salesByDaypart={salesByDaypart}
      branchPerformance={branchPerformance}
      topMenuItems={topMenuItems}
      worstMenuItems={worstMenuItems}
      activeAlerts={activeAlerts}
      staffSummary={staffSummary}
      kpiData={kpiData}
    />
  );
}
