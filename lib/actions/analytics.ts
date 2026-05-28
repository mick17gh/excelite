"use server";

import { db } from "@/lib/db";

/**
 * Get sales trends over time with comparison periods
 */
export async function getSalesTrends(
  branchId?: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate || new Date();
    const branchFilter = branchId ? { branchId } : {};

    // Current period sales
    const currentSales = await db.sale.findMany({
      where: {
        deletedAt: null,
        ...branchFilter,
        saleDate: { gte: start, lte: end },
      },
      select: {
        saleDate: true,
        total: true,
        subtotal: true,
        tax: true,
      },
    });

    // Previous period (same duration before start date)
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    const prevEnd = new Date(start.getTime() - 1);

    const previousSales = await db.sale.findMany({
      where: {
        deletedAt: null,
        ...branchFilter,
        saleDate: { gte: prevStart, lte: prevEnd },
      },
      select: {
        total: true,
      },
    });

    // Aggregate current period by day
    const dailyData: Record<string, { revenue: number; count: number }> = {};
    currentSales.forEach((sale) => {
      const dateKey = sale.saleDate.toISOString().split("T")[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { revenue: 0, count: 0 };
      }
      dailyData[dateKey].revenue += Number(sale.total);
      dailyData[dateKey].count += 1;
    });

    const currentTotal = currentSales.reduce((s, x) => s + Number(x.total), 0);
    const previousTotal = previousSales.reduce((s, x) => s + Number(x.total), 0);
    const growthRate = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    return {
      success: true,
      data: {
        currentPeriod: {
          revenue: Math.round(currentTotal * 100) / 100,
          transactions: currentSales.length,
          averageTicket: Math.round((currentTotal / (currentSales.length || 1)) * 100) / 100,
        },
        previousPeriod: {
          revenue: Math.round(previousTotal * 100) / 100,
          transactions: previousSales.length,
        },
        growthRate: Math.round(growthRate * 10) / 10,
        dailyTrend: Object.entries(dailyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, data]) => ({
            date,
            revenue: Math.round(data.revenue * 100) / 100,
            transactions: data.count,
          })),
      },
    };
  } catch (error) {
    console.error("[getSalesTrends] Error:", error);
    return { success: false, error: "Failed to fetch sales trends" };
  }
}

/**
 * Get product performance analytics
 */
export async function getProductPerformance(
  branchId?: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 20
) {
  try {
    const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate || new Date();
    const branchFilter = branchId ? { branchId } : {};

    const sales = await db.sale.findMany({
      where: {
        deletedAt: null,
        ...branchFilter,
        saleDate: { gte: start, lte: end },
      },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    // Aggregate by menu item
    const productData: Record<
      string,
      {
        name: string;
        category: string;
        quantitySold: number;
        revenue: number;
        cost: number;
        profit: number;
      }
    > = {};

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const id = item.menuItemId;
        if (!productData[id]) {
          productData[id] = {
            name: item.menuItem?.name || "Unknown",
            category: item.menuItem?.category?.name || "Unknown",
            quantitySold: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          };
        }
        productData[id].quantitySold += Number(item.quantity);
        productData[id].revenue += Number(item.total);
        productData[id].cost += Number(item.unitCost) * Number(item.quantity);
      });
    });

    // Calculate profit for each product
    Object.values(productData).forEach((product) => {
      product.profit = product.revenue - product.cost;
    });

    // Sort by revenue and get top/bottom performers
    const sortedProducts = Object.values(productData).sort((a, b) => b.revenue - a.revenue);
    const topPerformers = sortedProducts.slice(0, limit);
    const bottomPerformers = sortedProducts.slice(-limit).reverse();

    // Calculate totals
    const totalRevenue = sortedProducts.reduce((s, p) => s + p.revenue, 0);
    const totalProfit = sortedProducts.reduce((s, p) => s + p.profit, 0);

    return {
      success: true,
      data: {
        summary: {
          totalProducts: sortedProducts.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalProfit: Math.round(totalProfit * 100) / 100,
          averageMargin:
            totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0,
        },
        topPerformers: topPerformers.map((p) => ({
          ...p,
          revenue: Math.round(p.revenue * 100) / 100,
          profit: Math.round(p.profit * 100) / 100,
          margin: p.revenue > 0 ? Math.round((p.profit / p.revenue) * 1000) / 10 : 0,
        })),
        bottomPerformers: bottomPerformers.map((p) => ({
          ...p,
          revenue: Math.round(p.revenue * 100) / 100,
          profit: Math.round(p.profit * 100) / 100,
          margin: p.revenue > 0 ? Math.round((p.profit / p.revenue) * 1000) / 10 : 0,
        })),
      },
    };
  } catch (error) {
    console.error("[getProductPerformance] Error:", error);
    return { success: false, error: "Failed to fetch product performance" };
  }
}

/**
 * Get branch comparison analytics
 */
export async function getBranchComparison(startDate?: Date, endDate?: Date) {
  try {
    const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate || new Date();

    const branches = await db.branch.findMany({
      where: { isActive: true, deletedAt: null },
    });

    const branchData = await Promise.all(
      branches.map(async (branch) => {
        const [sales, waste, staff] = await Promise.all([
          db.sale.findMany({
            where: {
              deletedAt: null,
              branchId: branch.id,
              saleDate: { gte: start, lte: end },
            },
            include: { items: true },
          }),
          db.wasteLog.findMany({
            where: {
              branchId: branch.id,
              wasteDate: { gte: start, lte: end },
            },
          }),
          db.staff.count({
            where: { branchId: branch.id, isActive: true, deletedAt: null },
          }),
        ]);

        const revenue = sales.reduce((s, x) => s + Number(x.total), 0);
        const cogs = sales.reduce((sum, sale) => {
          return (
            sum +
            sale.items.reduce((s, it) => s + Number(it.unitCost) * Number(it.quantity), 0)
          );
        }, 0);
        const wasteCost = waste.reduce((s, w) => s + Number(w.totalCost), 0);
        const profit = revenue - cogs - wasteCost;

        return {
          branchId: branch.id,
          branchName: branch.name,
          revenue: Math.round(revenue * 100) / 100,
          transactions: sales.length,
          cogs: Math.round(cogs * 100) / 100,
          waste: Math.round(wasteCost * 100) / 100,
          profit: Math.round(profit * 100) / 100,
          margin: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0,
          staffCount: staff,
          revenuePerStaff: staff > 0 ? Math.round((revenue / staff) * 100) / 100 : 0,
        };
      })
    );

    // Sort by revenue
    branchData.sort((a, b) => b.revenue - a.revenue);

    return {
      success: true,
      data: branchData,
    };
  } catch (error) {
    console.error("[getBranchComparison] Error:", error);
    return { success: false, error: "Failed to fetch branch comparison" };
  }
}

/**
 * Get customer insights (based on transaction patterns)
 */
export async function getCustomerInsights(branchId?: string, startDate?: Date, endDate?: Date) {
  try {
    const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate || new Date();
    const branchFilter = branchId ? { branchId } : {};

    const sales = await db.sale.findMany({
      where: {
        deletedAt: null,
        ...branchFilter,
        saleDate: { gte: start, lte: end },
      },
      select: {
        total: true,
        saleDate: true,
        channel: true,
        customerCount: true,
      },
    });

    // Analyze by hour
    const hourlyData: Record<number, { revenue: number; count: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { revenue: 0, count: 0 };
    }

    sales.forEach((sale) => {
      const hour = sale.saleDate.getHours();
      hourlyData[hour].revenue += Number(sale.total);
      hourlyData[hour].count += 1;
    });

    // Analyze by day of week
    const dayOfWeekData: Record<number, { revenue: number; count: number }> = {};
    for (let i = 0; i < 7; i++) {
      dayOfWeekData[i] = { revenue: 0, count: 0 };
    }

    sales.forEach((sale) => {
      const day = sale.saleDate.getDay();
      dayOfWeekData[day].revenue += Number(sale.total);
      dayOfWeekData[day].count += 1;
    });

    // Find peak hours
    const peakHours = Object.entries(hourlyData)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        revenue: Math.round(data.revenue * 100) / 100,
        transactions: data.count,
      }));

    // Find best days
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const bestDays = Object.entries(dayOfWeekData)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .map(([day, data]) => ({
        day: dayNames[parseInt(day)],
        revenue: Math.round(data.revenue * 100) / 100,
        transactions: data.count,
      }));

    // Average ticket size
    const totalRevenue = sales.reduce((s, x) => s + Number(x.total), 0);
    const avgTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

    // Total customers
    const totalCustomers = sales.reduce((s, x) => s + (x.customerCount || 1), 0);

    return {
      success: true,
      data: {
        summary: {
          totalTransactions: sales.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          averageTicket: Math.round(avgTicket * 100) / 100,
          totalCustomers,
          revenuePerCustomer:
            totalCustomers > 0 ? Math.round((totalRevenue / totalCustomers) * 100) / 100 : 0,
        },
        peakHours,
        salesByDay: bestDays,
        hourlyDistribution: Object.entries(hourlyData).map(([hour, data]) => ({
          hour: parseInt(hour),
          revenue: Math.round(data.revenue * 100) / 100,
          transactions: data.count,
        })),
      },
    };
  } catch (error) {
    console.error("[getCustomerInsights] Error:", error);
    return { success: false, error: "Failed to fetch customer insights" };
  }
}

/**
 * Get inventory analytics
 */
export async function getInventoryAnalytics(branchId?: string) {
  try {
    const branchFilter = branchId ? { branchId } : {};

    const [items, recentMovements, wasteLogs] = await Promise.all([
      db.inventoryItem.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          ...branchFilter,
        },
        include: { branch: true, category: { select: { name: true } } },
      }),
      db.outboundStock.findMany({
        where: {
          ...branchFilter,
          createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) },
        },
        include: { item: true },
      }),
      db.wasteLog.findMany({
        where: {
          ...branchFilter,
          wasteDate: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) },
        },
      }),
    ]);

    // Calculate totals
    const totalValue = items.reduce((s, i) => s + Number(i.currentStock) * Number(i.unitCost), 0);
    const lowStockItems = items.filter((i) => Number(i.currentStock) <= Number(i.reorderPoint));
    const overstockItems = items.filter((i) => Number(i.currentStock) > Number(i.maxStock));
    const totalWasteCost = wasteLogs.reduce((s, w) => s + Number(w.totalCost), 0);

    // Calculate turnover rate (simplified)
    const totalOutbound = recentMovements
      .filter((m) => m.movementType.startsWith("OUTBOUND"))
      .reduce((s, m) => s + Number(m.quantity) * Number(m.item?.unitCost || 0), 0);
    const turnoverRate = totalValue > 0 ? (totalOutbound / totalValue) * 12 : 0; // Annualized

    // Group by category
    const byCategory: Record<string, { count: number; value: number; waste: number }> = {};
    items.forEach((item) => {
      const categoryName = item.category.name;
      if (!byCategory[categoryName]) {
        byCategory[categoryName] = { count: 0, value: 0, waste: 0 };
      }
      byCategory[categoryName].count += 1;
      byCategory[categoryName].value += Number(item.currentStock) * Number(item.unitCost);
    });

    // Add waste by category
    wasteLogs.forEach((log) => {
      const item = items.find((i) => i.id === log.itemId);
      if (item && byCategory[item.category.name]) {
        byCategory[item.category.name].waste += Number(log.totalCost);
      }
    });

    return {
      success: true,
      data: {
        summary: {
          totalItems: items.length,
          totalValue: Math.round(totalValue * 100) / 100,
          lowStockCount: lowStockItems.length,
          overstockCount: overstockItems.length,
          totalWasteCost: Math.round(totalWasteCost * 100) / 100,
          wastePercentage: totalValue > 0 ? Math.round((totalWasteCost / totalValue) * 1000) / 10 : 0,
          turnoverRate: Math.round(turnoverRate * 10) / 10,
        },
        byCategory: Object.entries(byCategory).map(([category, data]) => ({
          category,
          itemCount: data.count,
          value: Math.round(data.value * 100) / 100,
          waste: Math.round(data.waste * 100) / 100,
        })),
        criticalItems: lowStockItems.slice(0, 10).map((item) => ({
          name: item.name,
          sku: item.sku,
          branch: item.branch?.name || "Unknown",
          currentStock: Number(item.currentStock),
          reorderPoint: Number(item.reorderPoint),
          unit: item.unit,
          daysUntilStockout: 0, // Would need usage rate to calculate
        })),
      },
    };
  } catch (error) {
    console.error("[getInventoryAnalytics] Error:", error);
    return { success: false, error: "Failed to fetch inventory analytics" };
  }
}

/**
 * Get staff performance analytics
 */
export async function getStaffPerformance(branchId?: string, startDate?: Date, endDate?: Date) {
  try {
    const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate || new Date();
    const branchFilter = branchId ? { branchId } : {};

    const [staff, schedules, transactions] = await Promise.all([
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
          scheduledDate: { gte: start, lte: end },
        },
      }),
      db.transaction.findMany({
        where: {
          ...branchFilter,
          transactionDate: { gte: start, lte: end },
          isVoided: false,
        },
        select: {
          staffId: true,
          amount: true,
        },
      }),
    ]);

    // Calculate performance metrics per staff
    const staffPerformance = staff.map((s) => {
      const staffSchedules = schedules.filter((sc) => sc.staffId === s.id);
      const staffTransactions = transactions.filter((t) => t.staffId === s.id);

      // Calculate hours worked
      const hoursWorked = staffSchedules.reduce((total, schedule) => {
        if (schedule.actualStart && schedule.actualEnd) {
          return total + (schedule.actualEnd.getTime() - schedule.actualStart.getTime()) / (1000 * 60 * 60);
        }
        return total;
      }, 0);

      // Calculate scheduled hours
      const scheduledHours = staffSchedules.reduce((total, schedule) => {
        return total + (schedule.shiftEnd.getTime() - schedule.shiftStart.getTime()) / (1000 * 60 * 60);
      }, 0);

      // Calculate sales
      const totalSales = staffTransactions.reduce((s, t) => s + Number(t.amount), 0);

      return {
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        role: s.role.replace(/_/g, " "),
        branch: s.branch?.name || "Unknown",
        scheduledHours: Math.round(scheduledHours * 10) / 10,
        hoursWorked: Math.round(hoursWorked * 10) / 10,
        attendance: scheduledHours > 0 ? Math.round((hoursWorked / scheduledHours) * 1000) / 10 : 0,
        transactionCount: staffTransactions.length,
        totalSales: Math.round(totalSales * 100) / 100,
        salesPerHour: hoursWorked > 0 ? Math.round((totalSales / hoursWorked) * 100) / 100 : 0,
      };
    });

    // Sort by sales per hour
    staffPerformance.sort((a, b) => b.salesPerHour - a.salesPerHour);

    return {
      success: true,
      data: {
        summary: {
          totalStaff: staff.length,
          totalScheduledHours: Math.round(staffPerformance.reduce((s, p) => s + p.scheduledHours, 0) * 10) / 10,
          totalHoursWorked: Math.round(staffPerformance.reduce((s, p) => s + p.hoursWorked, 0) * 10) / 10,
          averageAttendance: Math.round(
            (staffPerformance.reduce((s, p) => s + p.attendance, 0) / (staffPerformance.length || 1)) * 10
          ) / 10,
        },
        staffMetrics: staffPerformance,
        topPerformers: staffPerformance.slice(0, 5),
      },
    };
  } catch (error) {
    console.error("[getStaffPerformance] Error:", error);
    return { success: false, error: "Failed to fetch staff performance" };
  }
}
