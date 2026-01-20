"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { DayPart, SalesChannel } from "@/lib/generated/prisma/client";

function generateTransactionRef(): string {
  const prefix = "TXN";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

function generateSaleNumber(): string {
  const prefix = "SALE";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

function getDayPart(): DayPart {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return "BREAKFAST";
  if (hour >= 11 && hour < 15) return "LUNCH";
  if (hour >= 15 && hour < 21) return "DINNER";
  return "LATE_NIGHT";
}

export interface SaleItemInput {
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discount?: number;
}

export interface CreateTransactionInput {
  branchId: string;
  staffId?: string;
  paymentMethod: string;
  channel: SalesChannel;
  items: SaleItemInput[];
  tip?: number;
  customerCount?: number;
}

export async function createTransaction(input: CreateTransactionInput) {
  try {
    const transactionRef = generateTransactionRef();
    const saleNumber = generateSaleNumber();

    // Calculate totals
    let subtotal = 0;
    const saleItems: Array<{
      menuItemId: string;
      quantity: number;
      unitPrice: number;
      unitCost: number;
      total: number;
      discount: number;
    }> = [];

    for (const item of input.items) {
      const itemTotal = item.quantity * item.unitPrice - (item.discount || 0);
      subtotal += itemTotal;
      saleItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        total: itemTotal,
        discount: item.discount || 0,
      });
    }

    const tax = subtotal * 0.125; // 12.5% VAT for Ghana
    const total = subtotal + tax;
    const amount = total + (input.tip || 0);

    // Create transaction
    const transaction = await db.transaction.create({
      data: {
        transactionRef,
        branchId: input.branchId,
        staffId: input.staffId,
        paymentMethod: input.paymentMethod,
        amount,
        tip: input.tip || 0,
        transactionDate: new Date(),
      },
    });

    // Create sale
    const sale = await db.sale.create({
      data: {
        saleNumber,
        branchId: input.branchId,
        transactionId: transaction.id,
        subtotal,
        tax,
        total,
        dayPart: getDayPart(),
        channel: input.channel,
        customerCount: input.customerCount || 1,
        saleDate: new Date(),
        items: {
          create: saleItems,
        },
      },
      include: {
        items: true,
      },
    });

    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard");
    return { success: true, data: { transaction, sale } };
  } catch (error) {
    console.error("[createTransaction] Error:", error);
    return { success: false, error: "Failed to create transaction" };
  }
}

export async function voidTransaction(transactionId: string, reason: string) {
  try {
    const transaction = await db.transaction.update({
      where: { id: transactionId },
      data: {
        isVoided: true,
        voidReason: reason,
      },
    });

    // Also delete the associated sale
    await db.sale.updateMany({
      where: { transactionId },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/dashboard/transactions");
    return { success: true, data: transaction };
  } catch (error) {
    console.error("[voidTransaction] Error:", error);
    return { success: false, error: "Failed to void transaction" };
  }
}

export async function getTransactions(branchId?: string, date?: Date) {
  try {
    const startOfDay = date ? new Date(date.setHours(0, 0, 0, 0)) : undefined;
    const endOfDay = date ? new Date(date.setHours(23, 59, 59, 999)) : undefined;

    const transactions = await db.transaction.findMany({
      where: {
        ...(branchId && { branchId }),
        ...(startOfDay &&
          endOfDay && {
            transactionDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
          }),
      },
      include: {
        branch: true,
        staff: true,
        sale: {
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
          },
        },
      },
      orderBy: { transactionDate: "desc" },
    });

    return { success: true, data: transactions };
  } catch (error) {
    console.error("[getTransactions] Error:", error);
    return { success: false, error: "Failed to fetch transactions", data: [] };
  }
}

export async function getSales(branchId?: string, startDate?: Date, endDate?: Date) {
  try {
    const sales = await db.sale.findMany({
      where: {
        deletedAt: null,
        ...(branchId && { branchId }),
        ...(startDate &&
          endDate && {
            saleDate: {
              gte: startDate,
              lte: endDate,
            },
          }),
      },
      include: {
        branch: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: { saleDate: "desc" },
    });

    return { success: true, data: sales };
  } catch (error) {
    console.error("[getSales] Error:", error);
    return { success: false, error: "Failed to fetch sales", data: [] };
  }
}

export async function getSalesByChannel(branchId?: string, days: number = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await db.sale.findMany({
      where: {
        deletedAt: null,
        saleDate: { gte: startDate },
        ...(branchId && { branchId }),
      },
    });

    const channelTotals: Record<string, { revenue: number; count: number }> = {
      DINE_IN: { revenue: 0, count: 0 },
      TAKEOUT: { revenue: 0, count: 0 },
      DELIVERY: { revenue: 0, count: 0 },
      APP: { revenue: 0, count: 0 },
    };

    let totalRevenue = 0;

    for (const sale of sales) {
      const amount = Number(sale.total);
      channelTotals[sale.channel].revenue += amount;
      channelTotals[sale.channel].count += 1;
      totalRevenue += amount;
    }

    const result = Object.entries(channelTotals).map(([channel, data]) => ({
      channel: channel.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      revenue: data.revenue,
      percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error("[getSalesByChannel] Error:", error);
    return { success: false, error: "Failed to fetch sales by channel", data: [] };
  }
}

export async function getSalesByDaypart(branchId?: string, days: number = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await db.sale.findMany({
      where: {
        deletedAt: null,
        saleDate: { gte: startDate },
        ...(branchId && { branchId }),
      },
    });

    const daypartTotals: Record<string, { revenue: number; transactions: number }> = {
      BREAKFAST: { revenue: 0, transactions: 0 },
      LUNCH: { revenue: 0, transactions: 0 },
      DINNER: { revenue: 0, transactions: 0 },
      LATE_NIGHT: { revenue: 0, transactions: 0 },
    };

    for (const sale of sales) {
      daypartTotals[sale.dayPart].revenue += Number(sale.total);
      daypartTotals[sale.dayPart].transactions += 1;
    }

    const result = Object.entries(daypartTotals).map(([daypart, data]) => ({
      daypart: daypart.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      revenue: data.revenue,
      transactions: data.transactions,
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error("[getSalesByDaypart] Error:", error);
    return { success: false, error: "Failed to fetch sales by daypart", data: [] };
  }
}

export async function getTopMenuItems(branchId?: string, days: number = 30, limit: number = 5) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const saleItems = await db.saleItem.findMany({
      where: {
        sale: {
          deletedAt: null,
          saleDate: { gte: startDate },
          ...(branchId && { branchId }),
        },
      },
      include: {
        menuItem: true,
      },
    });

    const itemTotals: Record<string, { name: string; quantity: number; revenue: number }> = {};

    for (const item of saleItems) {
      const key = item.menuItemId;
      if (!itemTotals[key]) {
        itemTotals[key] = {
          name: item.menuItem.name,
          quantity: 0,
          revenue: 0,
        };
      }
      itemTotals[key].quantity += item.quantity;
      itemTotals[key].revenue += Number(item.total);
    }

    const sorted = Object.values(itemTotals).sort((a, b) => b.revenue - a.revenue);
    const top = sorted.slice(0, limit);
    const worst = sorted.slice(-limit).reverse();

    return { success: true, data: { top, worst } };
  } catch (error) {
    console.error("[getTopMenuItems] Error:", error);
    return { success: false, error: "Failed to fetch top menu items", data: { top: [], worst: [] } };
  }
}

export async function getRevenueData(branchId?: string, days: number = 30) {
  try {
    const data: Array<{ date: string; revenue: number; target: number }> = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await db.sale.findMany({
      where: {
        deletedAt: null,
        saleDate: { gte: startDate, lte: endDate },
        ...(branchId && { branchId }),
      },
    });

    // Group sales by date
    const salesByDate: Record<string, number> = {};
    for (const sale of sales) {
      const dateKey = sale.saleDate.toISOString().split("T")[0];
      salesByDate[dateKey] = (salesByDate[dateKey] || 0) + Number(sale.total);
    }

    // Generate data for each day
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });

      data.push({
        date: monthDay,
        revenue: salesByDate[dateKey] || 0,
        target: 50000, // Default target
      });
    }

    return { success: true, data };
  } catch (error) {
    console.error("[getRevenueData] Error:", error);
    return { success: false, error: "Failed to fetch revenue data", data: [] };
  }
}

export async function getKPIData(branchIds?: string[]) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const prevStartDate = new Date();
    prevStartDate.setDate(prevStartDate.getDate() - 60);
    const prevEndDate = new Date();
    prevEndDate.setDate(prevEndDate.getDate() - 30);

    // Current period sales
    const currentSales = await db.sale.findMany({
      where: {
        deletedAt: null,
        saleDate: { gte: startDate },
        ...(branchIds && branchIds.length > 0 && { branchId: { in: branchIds } }),
      },
      include: { items: true },
    });

    // Previous period sales
    const prevSales = await db.sale.findMany({
      where: {
        deletedAt: null,
        saleDate: { gte: prevStartDate, lte: prevEndDate },
        ...(branchIds && branchIds.length > 0 && { branchId: { in: branchIds } }),
      },
    });

    // Current period waste
    const currentWaste = await db.wasteLog.findMany({
      where: {
        wasteDate: { gte: startDate },
        ...(branchIds && branchIds.length > 0 && { branchId: { in: branchIds } }),
      },
    });

    // Calculate metrics
    const totalRevenue = currentSales.reduce((sum, s) => sum + Number(s.total), 0);
    const prevRevenue = prevSales.reduce((sum, s) => sum + Number(s.total), 0);
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const transactionCount = currentSales.length;
    const averageTicket = transactionCount > 0 ? totalRevenue / transactionCount : 0;

    // Calculate COGS from sale items
    let totalCogs = 0;
    for (const sale of currentSales) {
      for (const item of sale.items) {
        totalCogs += Number(item.unitCost) * item.quantity;
      }
    }
    const cogsPercentage = totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0;
    const profitMargin = 100 - cogsPercentage;

    const wasteTotal = currentWaste.reduce((sum, w) => sum + Number(w.totalCost), 0);

    return {
      success: true,
      data: {
        totalRevenue,
        revenueGrowth,
        cogsPercentage,
        profitMargin,
        transactionCount,
        averageTicket,
        wasteTotal,
        wasteChange: -5.2, // Placeholder
      },
    };
  } catch (error) {
    console.error("[getKPIData] Error:", error);
    return {
      success: false,
      error: "Failed to fetch KPI data",
      data: {
        totalRevenue: 0,
        revenueGrowth: 0,
        cogsPercentage: 0,
        profitMargin: 0,
        transactionCount: 0,
        averageTicket: 0,
        wasteTotal: 0,
        wasteChange: 0,
      },
    };
  }
}

export async function getMenuItems() {
  try {
    const items = await db.menuItem.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: items };
  } catch (error) {
    console.error("[getMenuItems] Error:", error);
    return { success: false, error: "Failed to fetch menu items", data: [] };
  }
}

export async function getHourlySalesData(branchId?: string, days: number = 1) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await db.sale.findMany({
      where: {
        deletedAt: null,
        saleDate: { gte: startDate, lte: endDate },
        ...(branchId && { branchId }),
      },
    });

    const hourlyTotals: Record<
      number,
      {
        transactions: number;
        revenue: number;
      }
    > = {};

    for (let h = 0; h < 24; h++) {
      hourlyTotals[h] = { transactions: 0, revenue: 0 };
    }

    for (const sale of sales) {
      const hour = sale.saleDate.getHours();
      const bucket = hourlyTotals[hour];
      bucket.transactions += 1;
      bucket.revenue += Number(sale.total);
    }

    const formatHourLabel = (hour: number) => {
      const suffix = hour < 12 ? "AM" : "PM";
      const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${display}${suffix}`;
    };

    const data = Object.entries(hourlyTotals)
      .filter(([h]) => {
        const hour = Number(h);
        return hour >= 6 && hour <= 23;
      })
      .map(([h, value]) => {
        const hour = Number(h);
        return {
          hour: formatHourLabel(hour),
          transactions: value.transactions,
          revenue: value.revenue,
        };
      });

    return { success: true, data };
  } catch (error) {
    console.error("[getHourlySalesData] Error:", error);
    return { success: false, error: "Failed to fetch hourly sales data", data: [] };
  }
}
