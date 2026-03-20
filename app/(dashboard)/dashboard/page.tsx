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
import { getOrganization } from "@/lib/actions/organization";

export const metadata = {
  title: "Executive Dashboard | ServStack",
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
    orgResult,
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
    getOrganization(),
  ]);

  const organizationName = orgResult.data?.name || "ServStack";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const branches = (branchesResult.data || []).map((branch: Record<string, any>) => ({
    id: branch.id as string,
    name: branch.name as string,
    code: branch.code as string,
    city: branch.city as string,
    currency: branch.currency as string | undefined,
    isActive: branch.isActive as boolean,
    taxRate: branch.taxRate ? Number(branch.taxRate) : 0,
  }));
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
      organizationName={organizationName}
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
