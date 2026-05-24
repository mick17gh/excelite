"use server";

import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";

export interface DashboardFilters {
  branchIds?: string[];
  startDate: Date;
  endDate: Date;
}

export interface KPIData {
  totalRevenue: number;
  previousRevenue: number;
  transactionCount: number;
  previousTransactionCount: number;
  averageTicket: number;
  previousAverageTicket: number;
  grossProfit: number;
  previousGrossProfit: number;
  wasteTotal: number;
  previousWasteTotal: number;
  lowStockCount: number;
  complimentaryCount: number;
  complimentaryMenuValue: number;
}

const revenueSaleFilter = {
  NOT: {
    transaction: { paymentMethod: "COMPLIMENTARY" as const },
  },
};

export interface DashboardData {
  kpi: KPIData;
  revenueChart: { date: string; revenue: number; transactions: number }[];
  salesByChannel: { channel: string; revenue: number; percentage: number }[];
  salesByDaypart: { daypart: string; revenue: number; percentage: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
  branchPerformance: {
    branchId: string;
    branchName: string;
    revenue: number;
    transactions: number;
    trend: number;
  }[];
  staffSummary: {
    branchId: string;
    branchName: string;
    onDuty: number;
    total: number;
    status: "adequate" | "understaffed" | "overstaffed";
  }[];
  activeAlerts: {
    id: string;
    type: string;
    severity: string;
    title: string;
    branchName?: string;
    triggeredAt: Date;
  }[];
}

/**
 * Get all dashboard data in a single optimized call
 * Uses parallel queries and caching for performance
 */
export async function getDashboardDataOptimized(filters: DashboardFilters): Promise<{
  success: boolean;
  data?: DashboardData;
  error?: string;
}> {
  try {
    const { branchIds, startDate, endDate } = filters;
    const branchFilter = branchIds?.length ? { branchId: { in: branchIds } } : {};

    // Calculate previous period
    const duration = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - duration);
    const prevEnd = new Date(startDate.getTime() - 1);

    // Run all queries in parallel for maximum performance
    const [
      currentSales,
      previousSales,
      wasteCurrent,
      wastePrevious,
      lowStockCount,
      branches,
      staff,
      complimentaryOrders,
      alerts,
    ] = await Promise.all([
      // Current period sales
      db.sale.findMany({
        where: {
          deletedAt: null,
          ...branchFilter,
          saleDate: { gte: startDate, lte: endDate },
          ...revenueSaleFilter,
        },
        include: {
          items: { select: { unitCost: true, quantity: true, total: true, menuItemId: true } },
          branch: { select: { id: true, name: true } },
        },
      }),
      // Previous period sales
      db.sale.findMany({
        where: {
          deletedAt: null,
          ...branchFilter,
          saleDate: { gte: prevStart, lte: prevEnd },
          ...revenueSaleFilter,
        },
        include: {
          items: { select: { unitCost: true, quantity: true } },
        },
      }),
      // Current period waste
      db.wasteLog.findMany({
        where: {
          ...branchFilter,
          wasteDate: { gte: startDate, lte: endDate },
        },
      }),
      // Previous period waste
      db.wasteLog.findMany({
        where: {
          ...branchFilter,
          wasteDate: { gte: prevStart, lte: prevEnd },
        },
      }),
      // Low stock count
      db.inventoryItem.count({
        where: {
          deletedAt: null,
          isActive: true,
          ...branchFilter,
        },
      }),
      // Branches with staff
      db.branch.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          ...(branchIds?.length ? { id: { in: branchIds } } : {}),
        },
        include: {
          staff: {
            where: { deletedAt: null, isActive: true },
            select: { id: true, dutyStatus: true },
          },
        },
      }),
      // All active staff
      db.staff.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          ...branchFilter,
        },
        select: { id: true, branchId: true, dutyStatus: true },
      }),
      // Complimentary orders (non-revenue; menu value from line items)
      db.order.findMany({
        where: {
          isComplimentary: true,
          ...branchFilter,
          closedAt: { gte: startDate, lte: endDate },
        },
        include: {
          items: { select: { lineTotal: true } },
        },
      }),
      // Active alerts
      db.alert.findMany({
        where: {
          status: "ACTIVE",
          ...(branchIds?.length ? { branchId: { in: branchIds } } : {}),
        },
        include: {
          branch: { select: { name: true } },
        },
        orderBy: { triggeredAt: "desc" },
        take: 5,
      }),
    ]);

    // Calculate KPIs
    const currentRevenue = currentSales.reduce((s, x) => s + Number(x.total), 0);
    const previousRevenue = previousSales.reduce((s, x) => s + Number(x.total), 0);
    const currentCogs = currentSales.reduce(
      (sum, sale) => sum + sale.items.reduce((s, it) => s + Number(it.unitCost) * Number(it.quantity), 0),
      0
    );
    const previousCogs = previousSales.reduce(
      (sum, sale) => sum + sale.items.reduce((s, it) => s + Number(it.unitCost) * Number(it.quantity), 0),
      0
    );

    const kpi: KPIData = {
      totalRevenue: Math.round(currentRevenue * 100) / 100,
      previousRevenue: Math.round(previousRevenue * 100) / 100,
      transactionCount: currentSales.length,
      previousTransactionCount: previousSales.length,
      averageTicket: Math.round((currentRevenue / (currentSales.length || 1)) * 100) / 100,
      previousAverageTicket: Math.round((previousRevenue / (previousSales.length || 1)) * 100) / 100,
      grossProfit: Math.round((currentRevenue - currentCogs) * 100) / 100,
      previousGrossProfit: Math.round((previousRevenue - previousCogs) * 100) / 100,
      wasteTotal: Math.round(wasteCurrent.reduce((s, w) => s + Number(w.totalCost), 0) * 100) / 100,
      previousWasteTotal: Math.round(wastePrevious.reduce((s, w) => s + Number(w.totalCost), 0) * 100) / 100,
      lowStockCount,
      complimentaryCount: complimentaryOrders.length,
      complimentaryMenuValue: Math.round(
        complimentaryOrders.reduce(
          (sum, o) =>
            sum + o.items.reduce((s, it) => s + Number(it.lineTotal), 0),
          0,
        ) * 100,
      ) / 100,
    };

    // Build revenue chart data
    const dailyData: Record<string, { revenue: number; transactions: number }> = {};
    currentSales.forEach((sale) => {
      const dateKey = sale.saleDate.toISOString().split("T")[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { revenue: 0, transactions: 0 };
      }
      dailyData[dateKey].revenue += Number(sale.total);
      dailyData[dateKey].transactions += 1;
    });

    const revenueChart = Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        transactions: data.transactions,
      }));

    // Build sales by channel
    const channelData: Record<string, number> = {};
    currentSales.forEach((sale) => {
      const channel = sale.channel || "POS";
      channelData[channel] = (channelData[channel] || 0) + Number(sale.total);
    });

    const salesByChannel = Object.entries(channelData).map(([channel, revenue]) => ({
      channel,
      revenue: Math.round(revenue * 100) / 100,
      percentage: currentRevenue > 0 ? Math.round((revenue / currentRevenue) * 1000) / 10 : 0,
    }));

    // Build sales by daypart
    const daypartData: Record<string, number> = {};
    currentSales.forEach((sale) => {
      const daypart = sale.dayPart || "OTHER";
      daypartData[daypart] = (daypartData[daypart] || 0) + Number(sale.total);
    });

    const salesByDaypart = Object.entries(daypartData).map(([daypart, revenue]) => ({
      daypart: daypart.replace(/_/g, " "),
      revenue: Math.round(revenue * 100) / 100,
      percentage: currentRevenue > 0 ? Math.round((revenue / currentRevenue) * 1000) / 10 : 0,
    }));

    // Build top items
    const itemData: Record<string, { name: string; quantity: number; revenue: number }> = {};
    // We need menu item names, so let's fetch them
    const menuItemIds = new Set<string>();
    currentSales.forEach((sale) => {
      sale.items.forEach((item) => menuItemIds.add(item.menuItemId));
    });

    const menuItems = await db.menuItem.findMany({
      where: { id: { in: Array.from(menuItemIds) } },
      select: { id: true, name: true },
    });
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m.name]));

    currentSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const id = item.menuItemId;
        if (!itemData[id]) {
          itemData[id] = {
            name: menuItemMap.get(id) || "Unknown",
            quantity: 0,
            revenue: 0,
          };
        }
        itemData[id].quantity += Number(item.quantity);
        itemData[id].revenue += Number(item.total);
      });
    });

    const topItems = Object.values(itemData)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        revenue: Math.round(item.revenue * 100) / 100,
      }));

    // Build branch performance
    const branchSalesMap = new Map<string, { revenue: number; transactions: number }>();
    currentSales.forEach((sale) => {
      const existing = branchSalesMap.get(sale.branchId) || { revenue: 0, transactions: 0 };
      branchSalesMap.set(sale.branchId, {
        revenue: existing.revenue + Number(sale.total),
        transactions: existing.transactions + 1,
      });
    });

    // Previous period branch sales for trend
    const prevBranchSalesMap = new Map<string, number>();
    previousSales.forEach((sale) => {
      const existing = prevBranchSalesMap.get(sale.branchId) || 0;
      prevBranchSalesMap.set(sale.branchId, existing + Number(sale.total));
    });

    const branchPerformance = branches.map((branch) => {
      const current = branchSalesMap.get(branch.id) || { revenue: 0, transactions: 0 };
      const previous = prevBranchSalesMap.get(branch.id) || 0;
      const trend = previous > 0 ? ((current.revenue - previous) / previous) * 100 : 0;

      return {
        branchId: branch.id,
        branchName: branch.name,
        revenue: Math.round(current.revenue * 100) / 100,
        transactions: current.transactions,
        trend: Math.round(trend * 10) / 10,
      };
    });

    // Build staff summary
    const staffSummary = branches.map((branch) => {
      const branchStaff = staff.filter((s) => s.branchId === branch.id);
      const onDuty = branchStaff.filter((s) => s.dutyStatus === "ON_DUTY").length;
      const total = branchStaff.length;
      const required = Math.ceil(total * 0.6);

      let status: "adequate" | "understaffed" | "overstaffed" = "adequate";
      if (onDuty < required * 0.8) status = "understaffed";
      else if (onDuty > required * 1.2) status = "overstaffed";

      return {
        branchId: branch.id,
        branchName: branch.name,
        onDuty,
        total,
        status,
      };
    });

    // Format alerts
    const activeAlerts = alerts.map((alert) => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      branchName: alert.branch?.name,
      triggeredAt: alert.triggeredAt,
    }));

    return {
      success: true,
      data: {
        kpi,
        revenueChart,
        salesByChannel,
        salesByDaypart,
        topItems,
        branchPerformance,
        staffSummary,
        activeAlerts,
      },
    };
  } catch (error) {
    console.error("[getDashboardDataOptimized] Error:", error);
    return { success: false, error: "Failed to load dashboard data" };
  }
}

/**
 * Cached version of dashboard data for repeated loads
 * Cache is revalidated every 60 seconds
 */
export const getCachedDashboardData = unstable_cache(
  async (branchIdsJson: string, startDateStr: string, endDateStr: string) => {
    const branchIds = branchIdsJson ? JSON.parse(branchIdsJson) : undefined;
    return getDashboardDataOptimized({
      branchIds,
      startDate: new Date(startDateStr),
      endDate: new Date(endDateStr),
    });
  },
  ["dashboard-data"],
  { revalidate: 60, tags: ["dashboard"] }
);

/**
 * Get minimal KPI data for quick dashboard header
 */
export async function getQuickKPIs(branchIds?: string[]) {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const branchFilter = branchIds?.length ? { branchId: { in: branchIds } } : {};

    const [salesToday, lowStockCount, activeAlertCount] = await Promise.all([
      db.sale.aggregate({
        where: {
          deletedAt: null,
          ...branchFilter,
          saleDate: { gte: startOfDay },
        },
        _sum: { total: true },
        _count: true,
      }),
      db.inventoryItem.count({
        where: {
          deletedAt: null,
          isActive: true,
          ...branchFilter,
        },
      }),
      db.alert.count({
        where: {
          status: "ACTIVE",
          ...(branchIds?.length ? { branchId: { in: branchIds } } : {}),
        },
      }),
    ]);

    return {
      success: true,
      data: {
        todayRevenue: Number(salesToday._sum.total) || 0,
        todayTransactions: salesToday._count,
        lowStockCount,
        activeAlertCount,
      },
    };
  } catch (error) {
    console.error("[getQuickKPIs] Error:", error);
    return { success: false, error: "Failed to load KPIs" };
  }
}
