"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type ReportId =
  | "executive-summary"
  | "weekly-performance"
  | "sales-report"
  | "inventory-report"
  | "waste-variance"
  | "staff-report"
  | "manual-entries";

export interface GenerateReportInput {
  reportId: ReportId;
  branchId?: string; // undefined => all
  startDate: Date;
  endDate: Date;
}

export interface ReportResult {
  success: boolean;
  data?: {
    reportId: ReportId;
    reportName: string;
    period: { startDate: Date; endDate: Date };
    branchName?: string;
    generatedAt: Date;
    [key: string]: unknown;
  };
  error?: string;
}

export async function generateReportData(input: GenerateReportInput): Promise<ReportResult> {
  const branchFilter = input.branchId ? { branchId: input.branchId } : {};
  const branch = input.branchId
    ? await db.branch.findUnique({ where: { id: input.branchId } })
    : null;

  const baseResult = {
    reportId: input.reportId,
    period: { startDate: input.startDate, endDate: input.endDate },
    branchName: branch?.name || "All Branches",
    generatedAt: new Date(),
  };

  switch (input.reportId) {
    case "executive-summary": {
      const [sales, waste, lowStockCount, branchCount, staffOnDuty] = await Promise.all([
        db.sale.findMany({
          where: {
            deletedAt: null,
            ...branchFilter,
            saleDate: { gte: input.startDate, lte: input.endDate },
          },
          include: { items: true, branch: true },
        }),
        db.wasteLog.findMany({
          where: {
            ...branchFilter,
            wasteDate: { gte: input.startDate, lte: input.endDate },
          },
        }),
        db.inventoryItem.count({
          where: {
            deletedAt: null,
            isActive: true,
            ...branchFilter,
          },
        }),
        db.branch.count({ where: { isActive: true, deletedAt: null } }),
        db.staff.count({ where: { isActive: true, dutyStatus: "ON_DUTY", ...branchFilter } }),
      ]);

      const totalRevenue = sales.reduce((s, x) => s + Number(x.total), 0);
      const transactionCount = sales.length;
      const averageTicket = transactionCount ? totalRevenue / transactionCount : 0;
      const totalCogs = sales.reduce((sum, sale) => {
        return (
          sum +
          sale.items.reduce(
            (s, it) => s + Number(it.unitCost) * Number(it.quantity),
            0
          )
        );
      }, 0);
      const cogsPct = totalRevenue ? (totalCogs / totalRevenue) * 100 : 0;
      const grossProfit = totalRevenue - totalCogs;
      const wasteTotal = waste.reduce((s, w) => s + Number(w.totalCost), 0);

      // Group sales by branch
      const salesByBranch = sales.reduce((acc, sale) => {
        const branchName = sale.branch?.name || "Unknown";
        if (!acc[branchName]) {
          acc[branchName] = { revenue: 0, transactions: 0 };
        }
        acc[branchName].revenue += Number(sale.total);
        acc[branchName].transactions += 1;
        return acc;
      }, {} as Record<string, { revenue: number; transactions: number }>);

      return {
        success: true,
        data: {
          ...baseResult,
          reportName: "Executive Summary",
          summary: {
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            grossProfit: Math.round(grossProfit * 100) / 100,
            transactionCount,
            averageTicket: Math.round(averageTicket * 100) / 100,
            cogsPercentage: Math.round(cogsPct * 10) / 10,
            wasteTotal: Math.round(wasteTotal * 100) / 100,
            lowStockCount,
            branchCount,
            staffOnDuty,
          },
          salesByBranch: Object.entries(salesByBranch).map(([name, data]) => ({
            branchName: name,
            revenue: Math.round(data.revenue * 100) / 100,
            transactions: data.transactions,
          })),
        },
      };
    }

    case "weekly-performance": {
      const [sales, previousSales, targets] = await Promise.all([
        db.sale.findMany({
          where: {
            deletedAt: null,
            ...branchFilter,
            saleDate: { gte: input.startDate, lte: input.endDate },
          },
          include: { items: true, branch: true },
        }),
        // Previous period for comparison
        db.sale.findMany({
          where: {
            deletedAt: null,
            ...branchFilter,
            saleDate: {
              gte: new Date(input.startDate.getTime() - 7 * 24 * 60 * 60 * 1000),
              lt: input.startDate,
            },
          },
        }),
        db.target.findMany({
          where: {
            ...branchFilter,
            periodStart: { lte: input.endDate },
            periodEnd: { gte: input.startDate },
          },
        }),
      ]);

      const currentRevenue = sales.reduce((s, x) => s + Number(x.total), 0);
      const previousRevenue = previousSales.reduce((s, x) => s + Number(x.total), 0);
      const revenueChange = previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Daily breakdown
      const dailyData: Record<string, { revenue: number; transactions: number }> = {};
      sales.forEach((sale) => {
        const dateKey = sale.saleDate.toISOString().split("T")[0];
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { revenue: 0, transactions: 0 };
        }
        dailyData[dateKey].revenue += Number(sale.total);
        dailyData[dateKey].transactions += 1;
      });

      // Target progress
      const targetTotal = targets.reduce((s, t) => s + Number(t.targetValue), 0);
      const targetProgress = targetTotal ? (currentRevenue / targetTotal) * 100 : 0;

      return {
        success: true,
        data: {
          ...baseResult,
          reportName: "Weekly Performance Digest",
          summary: {
            currentRevenue: Math.round(currentRevenue * 100) / 100,
            previousRevenue: Math.round(previousRevenue * 100) / 100,
            revenueChange: Math.round(revenueChange * 10) / 10,
            transactionCount: sales.length,
            previousTransactionCount: previousSales.length,
            targetProgress: Math.round(targetProgress * 10) / 10,
          },
          dailyBreakdown: Object.entries(dailyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => ({
              date,
              revenue: Math.round(data.revenue * 100) / 100,
              transactions: data.transactions,
            })),
        },
      };
    }

    case "sales-report": {
      const sales = await db.sale.findMany({
        where: {
          deletedAt: null,
          ...branchFilter,
          saleDate: { gte: input.startDate, lte: input.endDate },
        },
        include: {
          items: { include: { menuItem: true } },
          branch: true,
        },
      });

      const totalRevenue = sales.reduce((s, x) => s + Number(x.total), 0);
      const totalTax = sales.reduce((s, x) => s + Number(x.tax), 0);

      // Sales by channel
      const byChannel: Record<string, { revenue: number; count: number }> = {};
      sales.forEach((sale) => {
        const channel = sale.channel || "POS";
        if (!byChannel[channel]) {
          byChannel[channel] = { revenue: 0, count: 0 };
        }
        byChannel[channel].revenue += Number(sale.total);
        byChannel[channel].count += 1;
      });

      // Sales by daypart
      const byDaypart: Record<string, { revenue: number; count: number }> = {};
      sales.forEach((sale) => {
        const hour = sale.saleDate.getHours();
        let daypart = "Late Night";
        if (hour >= 6 && hour < 11) daypart = "Breakfast";
        else if (hour >= 11 && hour < 15) daypart = "Lunch";
        else if (hour >= 15 && hour < 18) daypart = "Afternoon";
        else if (hour >= 18 && hour < 22) daypart = "Dinner";

        if (!byDaypart[daypart]) {
          byDaypart[daypart] = { revenue: 0, count: 0 };
        }
        byDaypart[daypart].revenue += Number(sale.total);
        byDaypart[daypart].count += 1;
      });

      // Top selling items
      const itemSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
      sales.forEach((sale) => {
        sale.items.forEach((item) => {
          const id = item.menuItemId;
          if (!itemSales[id]) {
            itemSales[id] = {
              name: item.menuItem?.name || "Unknown",
              quantity: 0,
              revenue: 0,
            };
          }
          itemSales[id].quantity += Number(item.quantity);
          itemSales[id].revenue += Number(item.total);
        });
      });

      const topItems = Object.values(itemSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map((item) => ({
          ...item,
          revenue: Math.round(item.revenue * 100) / 100,
        }));

      return {
        success: true,
        data: {
          ...baseResult,
          reportName: "Sales & Revenue Report",
          summary: {
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalTax: Math.round(totalTax * 100) / 100,
            transactionCount: sales.length,
            averageTicket: Math.round((totalRevenue / (sales.length || 1)) * 100) / 100,
          },
          byChannel: Object.entries(byChannel).map(([channel, data]) => ({
            channel,
            revenue: Math.round(data.revenue * 100) / 100,
            count: data.count,
            percentage: Math.round((data.revenue / totalRevenue) * 1000) / 10,
          })),
          byDaypart: Object.entries(byDaypart).map(([daypart, data]) => ({
            daypart,
            revenue: Math.round(data.revenue * 100) / 100,
            count: data.count,
            percentage: Math.round((data.revenue / totalRevenue) * 1000) / 10,
          })),
          topItems,
        },
      };
    }

    case "inventory-report": {
      const [items, movements, _branches] = await Promise.all([
        db.inventoryItem.findMany({
          where: {
            deletedAt: null,
            isActive: true,
            ...branchFilter,
          },
          include: { branch: true },
        }),
        db.outboundStock.findMany({
          where: {
            ...branchFilter,
            createdAt: { gte: input.startDate, lte: input.endDate },
          },
          include: { item: true },
        }),
        db.branch.findMany({
          where: { isActive: true, deletedAt: null },
        }),
      ]);

      const totalValue = items.reduce((s, i) => s + Number(i.currentStock) * Number(i.unitCost), 0);
      const lowStockItems = items.filter((i) => Number(i.currentStock) <= Number(i.reorderPoint));
      const overstockItems = items.filter((i) => Number(i.currentStock) > Number(i.maxStock));

      // Movement summary (outbound only from outboundStock table)
      const outboundQty = movements.reduce((s, m) => s + Number(m.quantity), 0);
      const outboundValue = movements.reduce((s, m) => s + Number(m.quantity) * Number(m.item?.unitCost || 0), 0);

      // By category
      const byCategory: Record<string, { count: number; value: number }> = {};
      items.forEach((item) => {
        if (!byCategory[item.category]) {
          byCategory[item.category] = { count: 0, value: 0 };
        }
        byCategory[item.category].count += 1;
        byCategory[item.category].value += Number(item.currentStock) * Number(item.unitCost);
      });

      return {
        success: true,
        data: {
          ...baseResult,
          reportName: "Inventory Status Report",
          summary: {
            totalItems: items.length,
            totalValue: Math.round(totalValue * 100) / 100,
            lowStockCount: lowStockItems.length,
            overstockCount: overstockItems.length,
            outboundValue: Math.round(outboundValue * 100) / 100,
            outboundQuantity: outboundQty,
          },
          byCategory: Object.entries(byCategory).map(([category, data]) => ({
            category,
            itemCount: data.count,
            value: Math.round(data.value * 100) / 100,
          })),
          lowStockItems: lowStockItems.slice(0, 20).map((item) => ({
            name: item.name,
            sku: item.sku,
            branch: item.branch?.name || "Unknown",
            currentStock: Number(item.currentStock),
            reorderPoint: Number(item.reorderPoint),
            unit: item.unit,
          })),
        },
      };
    }

    case "waste-variance": {
      const [wasteLogs, sales] = await Promise.all([
        db.wasteLog.findMany({
          where: {
            ...branchFilter,
            wasteDate: { gte: input.startDate, lte: input.endDate },
          },
          include: {
            item: true,
            branch: true,
          },
        }),
        db.sale.aggregate({
          where: {
            deletedAt: null,
            ...branchFilter,
            saleDate: { gte: input.startDate, lte: input.endDate },
          },
          _sum: { total: true },
        }),
      ]);

      const totalWasteCost = wasteLogs.reduce((s, w) => s + Number(w.totalCost), 0);
      const totalRevenue = Number(sales._sum.total) || 0;
      const wastePercentage = totalRevenue ? (totalWasteCost / totalRevenue) * 100 : 0;

      // By reason
      const byReason: Record<string, { count: number; cost: number }> = {};
      wasteLogs.forEach((log) => {
        const reason = log.reason || "Other";
        if (!byReason[reason]) {
          byReason[reason] = { count: 0, cost: 0 };
        }
        byReason[reason].count += 1;
        byReason[reason].cost += Number(log.totalCost);
      });

      // By branch
      const byBranch: Record<string, { count: number; cost: number }> = {};
      wasteLogs.forEach((log) => {
        const branchName = log.branch?.name || "Unknown";
        if (!byBranch[branchName]) {
          byBranch[branchName] = { count: 0, cost: 0 };
        }
        byBranch[branchName].count += 1;
        byBranch[branchName].cost += Number(log.totalCost);
      });

      // Top wasted items
      const byItem: Record<string, { name: string; quantity: number; cost: number }> = {};
      wasteLogs.forEach((log) => {
        const itemName = log.item?.name || "Unknown";
        if (!byItem[itemName]) {
          byItem[itemName] = { name: itemName, quantity: 0, cost: 0 };
        }
        byItem[itemName].quantity += Number(log.quantity);
        byItem[itemName].cost += Number(log.totalCost);
      });

      return {
        success: true,
        data: {
          ...baseResult,
          reportName: "Waste & Variance Report",
          summary: {
            totalWasteCost: Math.round(totalWasteCost * 100) / 100,
            wastePercentage: Math.round(wastePercentage * 100) / 100,
            totalIncidents: wasteLogs.length,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
          },
          byReason: Object.entries(byReason).map(([reason, data]) => ({
            reason,
            incidents: data.count,
            cost: Math.round(data.cost * 100) / 100,
          })),
          byBranch: Object.entries(byBranch).map(([branch, data]) => ({
            branch,
            incidents: data.count,
            cost: Math.round(data.cost * 100) / 100,
          })),
          topWastedItems: Object.values(byItem)
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 10)
            .map((item) => ({
              ...item,
              cost: Math.round(item.cost * 100) / 100,
            })),
        },
      };
    }

    case "manual-entries": {
      const [manualBatches, manualSales] = await Promise.all([
        db.manualEntryBatch.findMany({
          where: {
            ...branchFilter,
            periodStart: { lte: input.endDate },
            periodEnd: { gte: input.startDate },
          },
          include: {
            lines: true,
            branch: true,
            createdByUser: { select: { name: true, email: true } },
          },
          orderBy: { periodStart: "desc" },
        }),
        // Also get any sales created from manual entries (they have MAN- prefix)
        db.sale.findMany({
          where: {
            deletedAt: null,
            ...branchFilter,
            saleNumber: { startsWith: "MAN-" },
            saleDate: { gte: input.startDate, lte: input.endDate },
          },
          include: { branch: true },
        }),
      ]);

      // Calculate totals from manual entry lines
      let totalRevenue = 0;
      let totalTransactions = 0;
      const byChannel: Record<string, { revenue: number; transactions: number }> = {};
      const byBranch: Record<string, { revenue: number; transactions: number; batches: number }> = {};

      manualBatches.forEach((batch) => {
        const branchName = batch.branch?.name || "Unknown";
        if (!byBranch[branchName]) {
          byBranch[branchName] = { revenue: 0, transactions: 0, batches: 0 };
        }
        byBranch[branchName].batches += 1;

        batch.lines.forEach((line) => {
          const revenue = Number(line.totalRevenue);
          const txCount = line.transactionCount;
          totalRevenue += revenue;
          totalTransactions += txCount;
          byBranch[branchName].revenue += revenue;
          byBranch[branchName].transactions += txCount;

          if (!byChannel[line.channel]) {
            byChannel[line.channel] = { revenue: 0, transactions: 0 };
          }
          byChannel[line.channel].revenue += revenue;
          byChannel[line.channel].transactions += txCount;
        });
      });

      // Daily breakdown from sales records
      const dailyData: Record<string, { revenue: number; transactions: number }> = {};
      manualSales.forEach((sale) => {
        const dateKey = sale.saleDate.toISOString().split("T")[0];
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { revenue: 0, transactions: 0 };
        }
        dailyData[dateKey].revenue += Number(sale.total);
        dailyData[dateKey].transactions += sale.customerCount || 1;
      });

      return {
        success: true,
        data: {
          ...baseResult,
          reportName: "Manual Entries Report",
          summary: {
            totalBatches: manualBatches.length,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalTransactions,
            averageTicket: totalTransactions > 0 ? Math.round((totalRevenue / totalTransactions) * 100) / 100 : 0,
          },
          byChannel: Object.entries(byChannel).map(([channel, data]) => ({
            channel,
            revenue: Math.round(data.revenue * 100) / 100,
            transactions: data.transactions,
            percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 1000) / 10 : 0,
          })),
          byBranch: Object.entries(byBranch).map(([branch, data]) => ({
            branch,
            batches: data.batches,
            revenue: Math.round(data.revenue * 100) / 100,
            transactions: data.transactions,
          })),
          dailyBreakdown: Object.entries(dailyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => ({
              date,
              revenue: Math.round(data.revenue * 100) / 100,
              transactions: data.transactions,
            })),
          recentBatches: manualBatches.slice(0, 10).map((batch) => ({
            branch: batch.branch?.name || "Unknown",
            periodStart: batch.periodStart.toISOString().split("T")[0],
            periodEnd: batch.periodEnd.toISOString().split("T")[0],
            lineCount: batch.lines.length,
            totalRevenue: Math.round(batch.lines.reduce((s, l) => s + Number(l.totalRevenue), 0) * 100) / 100,
            createdBy: batch.createdByUser?.name || "System",
            createdAt: batch.createdAt.toISOString().split("T")[0],
          })),
        },
      };
    }

    case "staff-report": {
      const [staff, schedules] = await Promise.all([
        db.staff.findMany({
          where: {
            deletedAt: null,
            isActive: true,
            ...branchFilter,
          },
          include: { branch: true },
        }),
        db.staffSchedule.findMany({
          where: {
            ...branchFilter,
            scheduledDate: { gte: input.startDate, lte: input.endDate },
          },
          include: { staff: true, branch: true },
        }),
      ]);

      // Calculate total scheduled hours
      let totalScheduledHours = 0;
      let totalActualHours = 0;

      schedules.forEach((schedule) => {
        const scheduledHours =
          (schedule.shiftEnd.getTime() - schedule.shiftStart.getTime()) / (1000 * 60 * 60);
        totalScheduledHours += scheduledHours;

        if (schedule.actualStart && schedule.actualEnd) {
          const actualHours =
            (schedule.actualEnd.getTime() - schedule.actualStart.getTime()) / (1000 * 60 * 60);
          totalActualHours += actualHours;
        }
      });

      // By role
      const byRole: Record<string, { count: number; scheduledHours: number }> = {};
      staff.forEach((s) => {
        if (!byRole[s.role]) {
          byRole[s.role] = { count: 0, scheduledHours: 0 };
        }
        byRole[s.role].count += 1;
      });

      schedules.forEach((schedule) => {
        const role = schedule.staff?.role || "Unknown";
        if (byRole[role]) {
          const hours =
            (schedule.shiftEnd.getTime() - schedule.shiftStart.getTime()) / (1000 * 60 * 60);
          byRole[role].scheduledHours += hours;
        }
      });

      // By branch
      const byBranch: Record<string, { staffCount: number; scheduledShifts: number }> = {};
      staff.forEach((s) => {
        const branchName = s.branch?.name || "Unknown";
        if (!byBranch[branchName]) {
          byBranch[branchName] = { staffCount: 0, scheduledShifts: 0 };
        }
        byBranch[branchName].staffCount += 1;
      });

      schedules.forEach((schedule) => {
        const branchName = schedule.branch?.name || "Unknown";
        if (byBranch[branchName]) {
          byBranch[branchName].scheduledShifts += 1;
        }
      });

      // Estimate labor cost
      const estimatedLaborCost = staff.reduce((sum, s) => {
        const staffSchedules = schedules.filter((sc) => sc.staffId === s.id);
        const hours = staffSchedules.reduce((h, sc) => {
          return h + (sc.shiftEnd.getTime() - sc.shiftStart.getTime()) / (1000 * 60 * 60);
        }, 0);
        return sum + hours * Number(s.hourlyRate);
      }, 0);

      return {
        success: true,
        data: {
          ...baseResult,
          reportName: "Staff Scheduling Report",
          summary: {
            totalStaff: staff.length,
            totalScheduledHours: Math.round(totalScheduledHours * 10) / 10,
            totalActualHours: Math.round(totalActualHours * 10) / 10,
            scheduledShifts: schedules.length,
            estimatedLaborCost: Math.round(estimatedLaborCost * 100) / 100,
            utilization:
              totalScheduledHours > 0
                ? Math.round((totalActualHours / totalScheduledHours) * 1000) / 10
                : 0,
          },
          byRole: Object.entries(byRole).map(([role, data]) => ({
            role: role.replace(/_/g, " "),
            staffCount: data.count,
            scheduledHours: Math.round(data.scheduledHours * 10) / 10,
          })),
          byBranch: Object.entries(byBranch).map(([branch, data]) => ({
            branch,
            staffCount: data.staffCount,
            scheduledShifts: data.scheduledShifts,
          })),
        },
      };
    }

    default:
      return {
        success: false,
        error: "Report type not implemented yet",
      };
  }
}

// Save generated report for history
export async function saveReportToHistory(
  reportId: ReportId,
  reportName: string,
  format: "PDF" | "EXCEL",
  branchId?: string
) {
  // In a real implementation, this would save to a reports table
  // For now, we'll just return success
  revalidatePath("/dashboard/reports");
  return { success: true };
}

// Get recent reports (placeholder for when reports table exists)
export async function getRecentReports(limit: number = 10) {
  // This would query a reports history table
  // For now, return empty array
  return { success: true, data: [] };
}
