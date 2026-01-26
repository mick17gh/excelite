"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { DayPart, SalesChannel } from "@/lib/generated/prisma/client";
import { logCreate, logVoid } from "@/lib/services/audit";

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

    // Fetch branch tax settings
    const branch = await db.branch.findUnique({
      where: { id: input.branchId },
      select: { taxRate: true, taxEnabled: true },
    });
    const taxRate = branch?.taxEnabled ? Number(branch?.taxRate || 12.5) / 100 : 0;

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

    const tax = subtotal * taxRate;
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

    // Create audit log for the transaction
    await logCreate(
      "Transaction",
      transaction.id,
      {
        transactionRef,
        saleNumber,
        amount,
        branchId: input.branchId,
        channel: input.channel,
        itemCount: saleItems.length,
      }
    );

    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard");
    
    // Convert Decimal types to plain numbers for client serialization
    const serializedTransaction = {
      ...transaction,
      amount: Number(transaction.amount),
      tip: Number(transaction.tip),
    };
    
    const serializedSale = {
      ...sale,
      subtotal: Number(sale.subtotal),
      tax: Number(sale.tax),
      discount: Number(sale.discount || 0),
      total: Number(sale.total),
      items: sale.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        unitCost: Number(item.unitCost),
        total: Number(item.total),
        discount: Number(item.discount || 0),
      })),
    };
    
    return { success: true, data: { transaction: serializedTransaction, sale: serializedSale } };
  } catch (error) {
    console.error("[createTransaction] Error:", error);
    return { success: false, error: "Failed to create transaction" };
  }
}

export async function voidTransaction(transactionId: string, reason: string) {
  try {
    // Get current transaction state for audit log
    const existingTransaction = await db.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!existingTransaction) {
      return { success: false, error: "Transaction not found" };
    }

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

    // Create audit log for the void action
    await logVoid(
      "Transaction",
      transactionId,
      {
        transactionRef: existingTransaction.transactionRef,
        amount: Number(existingTransaction.amount),
        branchId: existingTransaction.branchId,
      },
      reason
    );

    revalidatePath("/dashboard/transactions");
    
    // Convert Decimal types to plain numbers for client serialization
    const serializedTransaction = {
      ...transaction,
      amount: Number(transaction.amount),
      tip: Number(transaction.tip),
    };
    
    return { success: true, data: serializedTransaction };
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

    // Convert Decimal types to plain numbers for client serialization
    const serializedTransactions = transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
      tip: Number(t.tip),
      sale: t.sale ? {
        ...t.sale,
        subtotal: Number(t.sale.subtotal),
        tax: Number(t.sale.tax),
        discount: Number(t.sale.discount || 0),
        total: Number(t.sale.total),
        items: t.sale.items.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          unitCost: Number(item.unitCost),
          total: Number(item.total),
          discount: Number(item.discount || 0),
          menuItem: {
            ...item.menuItem,
            price: Number(item.menuItem.price),
            cost: Number(item.menuItem.cost || 0),
          },
        })),
      } : null,
    }));

    return { success: true, data: serializedTransactions };
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

    // Convert Decimal types to plain numbers for client serialization
    const serializedSales = sales.map((sale) => ({
      ...sale,
      subtotal: Number(sale.subtotal),
      tax: Number(sale.tax),
      discount: Number(sale.discount || 0),
      total: Number(sale.total),
      items: sale.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        unitCost: Number(item.unitCost),
        total: Number(item.total),
        discount: Number(item.discount || 0),
        menuItem: {
          ...item.menuItem,
          price: Number(item.menuItem.price),
          cost: Number(item.menuItem.cost || 0),
        },
      })),
    }));

    return { success: true, data: serializedSales };
  } catch (error) {
    console.error("[getSales] Error:", error);
    return { success: false, error: "Failed to fetch sales", data: [] };
  }
}

export async function getSalesByChannel(branchId?: string, startDate?: Date, endDate?: Date) {
  try {
    const effectiveStartDate = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
    const effectiveEndDate = endDate || new Date();

    const sales = await db.sale.findMany({
      where: {
        deletedAt: null,
        saleDate: { gte: effectiveStartDate, lte: effectiveEndDate },
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

export async function getSalesByDaypart(branchId?: string, startDate?: Date, endDate?: Date) {
  try {
    const effectiveStartDate = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
    const effectiveEndDate = endDate || new Date();

    const sales = await db.sale.findMany({
      where: {
        deletedAt: null,
        saleDate: { gte: effectiveStartDate, lte: effectiveEndDate },
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

export async function getTopMenuItems(branchId?: string, startDate?: Date, endDate?: Date, limit: number = 5) {
  try {
    const effectiveStartDate = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
    const effectiveEndDate = endDate || new Date();

    const saleItems = await db.saleItem.findMany({
      where: {
        sale: {
          deletedAt: null,
          saleDate: { gte: effectiveStartDate, lte: effectiveEndDate },
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

export async function getRevenueData(branchId?: string, startDate?: Date, endDate?: Date) {
  try {
    const data: Array<{ date: string; revenue: number; target: number }> = [];
    const effectiveEndDate = endDate || new Date();
    const effectiveStartDate = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
    
    // Calculate days between dates
    const days = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Fetch sales and targets in parallel
    const [sales, targets] = await Promise.all([
      db.sale.findMany({
        where: {
          deletedAt: null,
          saleDate: { gte: effectiveStartDate, lte: effectiveEndDate },
          ...(branchId && { branchId }),
        },
      }),
      db.target.findMany({
        where: {
          isActive: true,
          targetType: "REVENUE",
          periodStart: { lte: effectiveEndDate },
          periodEnd: { gte: effectiveStartDate },
          ...(branchId && { branchId }),
        },
      }),
    ]);

    // Group sales by date
    const salesByDate: Record<string, number> = {};
    for (const sale of sales) {
      const dateKey = sale.saleDate.toISOString().split("T")[0];
      salesByDate[dateKey] = (salesByDate[dateKey] || 0) + Number(sale.total);
    }

    // Calculate daily target from monthly/period targets
    let dailyTarget = 0;
    if (targets.length > 0) {
      // Sum all targets and divide by period days to get daily target
      const totalTarget = targets.reduce((sum, t) => sum + Number(t.targetValue), 0);
      const targetDays = targets.reduce((sum, t) => {
        const start = new Date(Math.max(t.periodStart.getTime(), effectiveStartDate.getTime()));
        const end = new Date(Math.min(t.periodEnd.getTime(), effectiveEndDate.getTime()));
        return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }, 0);
      dailyTarget = targetDays > 0 ? totalTarget / targetDays : 0;
    }

    // Generate data for each day in the range
    for (let i = 0; i < days; i++) {
      const date = new Date(effectiveStartDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split("T")[0];
      const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });

      data.push({
        date: monthDay,
        revenue: salesByDate[dateKey] || 0,
        target: dailyTarget,
      });
    }

    return { success: true, data };
  } catch (error) {
    console.error("[getRevenueData] Error:", error);
    return { success: false, error: "Failed to fetch revenue data", data: [] };
  }
}

export async function getKPIData(branchIds?: string[], startDate?: Date, endDate?: Date) {
  try {
    const effectiveEndDate = endDate || new Date();
    const effectiveStartDate = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
    
    // Calculate the same period length for comparison
    const periodLength = effectiveEndDate.getTime() - effectiveStartDate.getTime();
    const prevEndDate = new Date(effectiveStartDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - periodLength);

    // Current period sales
    const currentSales = await db.sale.findMany({
      where: {
        deletedAt: null,
        saleDate: { gte: effectiveStartDate, lte: effectiveEndDate },
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
        wasteDate: { gte: effectiveStartDate, lte: effectiveEndDate },
        ...(branchIds && branchIds.length > 0 && { branchId: { in: branchIds } }),
      },
    });

    // Calculate metrics
    const totalRevenue = currentSales.reduce((sum, s) => sum + Number(s.total), 0);
    const prevRevenue = prevSales.reduce((sum, s) => sum + Number(s.total), 0);
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const transactionCount = currentSales.length;
    const prevTransactionCount = prevSales.length;
    const transactionChange = prevTransactionCount > 0 
      ? ((transactionCount - prevTransactionCount) / prevTransactionCount) * 100 
      : 0;

    const averageTicket = transactionCount > 0 ? totalRevenue / transactionCount : 0;
    const prevAverageTicket = prevTransactionCount > 0 ? prevRevenue / prevTransactionCount : 0;
    const averageTicketChange = prevAverageTicket > 0 
      ? ((averageTicket - prevAverageTicket) / prevAverageTicket) * 100 
      : 0;

    // Calculate COGS from sale items
    let totalCogs = 0;
    for (const sale of currentSales) {
      for (const item of sale.items) {
        totalCogs += Number(item.unitCost) * item.quantity;
      }
    }
    
    // Calculate previous period COGS
    const prevSalesWithItems = await db.sale.findMany({
      where: {
        deletedAt: null,
        saleDate: { gte: prevStartDate, lte: prevEndDate },
        ...(branchIds && branchIds.length > 0 && { branchId: { in: branchIds } }),
      },
      include: { items: true },
    });
    let prevCogs = 0;
    for (const sale of prevSalesWithItems) {
      for (const item of sale.items) {
        prevCogs += Number(item.unitCost) * item.quantity;
      }
    }
    
    const cogsPercentage = totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0;
    const prevCogsPercentage = prevRevenue > 0 ? (prevCogs / prevRevenue) * 100 : 0;
    const cogsChange = prevCogsPercentage > 0 
      ? cogsPercentage - prevCogsPercentage 
      : 0;
    
    const profitMargin = 100 - cogsPercentage;
    const prevProfitMargin = 100 - prevCogsPercentage;
    const profitMarginChange = prevProfitMargin > 0 
      ? profitMargin - prevProfitMargin 
      : 0;

    // Previous period waste for comparison
    const prevWaste = await db.wasteLog.findMany({
      where: {
        wasteDate: { gte: prevStartDate, lte: prevEndDate },
        ...(branchIds && branchIds.length > 0 && { branchId: { in: branchIds } }),
      },
    });
    const wasteTotal = currentWaste.reduce((sum, w) => sum + Number(w.totalCost), 0);
    const prevWasteTotal = prevWaste.reduce((sum, w) => sum + Number(w.totalCost), 0);
    const wasteChange = prevWasteTotal > 0 
      ? ((wasteTotal - prevWasteTotal) / prevWasteTotal) * 100 
      : 0;

    return {
      success: true,
      data: {
        totalRevenue,
        revenueGrowth,
        cogsPercentage,
        cogsChange,
        profitMargin,
        profitMarginChange,
        transactionCount,
        transactionChange,
        averageTicket,
        averageTicketChange,
        wasteTotal,
        wasteChange,
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
        cogsChange: 0,
        profitMargin: 0,
        profitMarginChange: 0,
        transactionCount: 0,
        transactionChange: 0,
        averageTicket: 0,
        averageTicketChange: 0,
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
    
    // Convert Decimal types to plain numbers for client serialization
    const serializedItems = items.map((item) => ({
      ...item,
      price: Number(item.price),
      cost: Number(item.cost),
    }));
    
    return { success: true, data: serializedItems };
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

// Combined function to fetch sales analytics data with date range and multiple branches
export async function getSalesAnalyticsData(branchIds?: string[], startDate?: Date, endDate?: Date) {
  try {
    const effectiveStartDate = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
    const effectiveEndDate = endDate || new Date();

    // Calculate previous period for comparison
    const periodLength = effectiveEndDate.getTime() - effectiveStartDate.getTime();
    const prevEndDate = new Date(effectiveStartDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - periodLength);

    // Fetch current and previous period sales in parallel
    const [sales, prevSales] = await Promise.all([
      db.sale.findMany({
        where: {
          deletedAt: null,
          saleDate: { gte: effectiveStartDate, lte: effectiveEndDate },
          ...(branchIds && branchIds.length > 0 && { branchId: { in: branchIds } }),
        },
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      }),
      db.sale.findMany({
        where: {
          deletedAt: null,
          saleDate: { gte: prevStartDate, lte: prevEndDate },
          ...(branchIds && branchIds.length > 0 && { branchId: { in: branchIds } }),
        },
      }),
    ]);

    // Calculate revenue data by date
    const revenueByDate = new Map<string, { revenue: number; target: number }>();
    const currentDate = new Date(effectiveStartDate);
    while (currentDate <= effectiveEndDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      revenueByDate.set(dateStr, { revenue: 0, target: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    for (const sale of sales) {
      const dateStr = new Date(sale.saleDate).toISOString().split("T")[0];
      const existing = revenueByDate.get(dateStr);
      if (existing) {
        existing.revenue += Number(sale.total);
      }
    }

    const revenueData = Array.from(revenueByDate.entries()).map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100,
      target: data.target,
    }));

    // Calculate sales by channel
    const channelMap = new Map<string, number>();
    for (const sale of sales) {
      const channel = sale.channel || "DINE_IN";
      channelMap.set(channel, (channelMap.get(channel) || 0) + Number(sale.total));
    }
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
    const salesByChannel = Array.from(channelMap.entries()).map(([channel, revenue]) => ({
      channel,
      revenue: Math.round(revenue * 100) / 100,
      percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
    }));

    // Calculate sales by daypart
    const daypartMap = new Map<string, { revenue: number; transactions: number }>();
    for (const sale of sales) {
      const daypart = sale.dayPart || "LUNCH";
      const existing = daypartMap.get(daypart) || { revenue: 0, transactions: 0 };
      existing.revenue += Number(sale.total);
      existing.transactions += 1;
      daypartMap.set(daypart, existing);
    }
    const salesByDaypart = Array.from(daypartMap.entries()).map(([daypart, data]) => ({
      daypart,
      revenue: Math.round(data.revenue * 100) / 100,
      transactions: data.transactions,
    }));

    // Calculate top/worst menu items
    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const name = item.menuItem?.name || "Unknown";
        const existing = itemMap.get(name) || { name, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += Number(item.total);
        itemMap.set(name, existing);
      }
    }
    const sortedItems = Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue);
    const topItems = sortedItems.slice(0, 5);
    const worstItems = sortedItems.slice(-5).reverse();

    // Calculate hourly data
    const hourlyMap = new Map<number, { transactions: number; revenue: number }>();
    for (let h = 0; h < 24; h++) {
      hourlyMap.set(h, { transactions: 0, revenue: 0 });
    }
    for (const sale of sales) {
      const hour = new Date(sale.saleDate).getHours();
      const existing = hourlyMap.get(hour)!;
      existing.transactions += 1;
      existing.revenue += Number(sale.total);
    }
    const hourlyData = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
      hour: `${hour.toString().padStart(2, "0")}:00`,
      transactions: data.transactions,
      revenue: Math.round(data.revenue * 100) / 100,
    }));

    // Calculate comparison metrics (reuse totalRevenue from above)
    const prevTotalRevenue = prevSales.reduce((sum, s) => sum + Number(s.total), 0);
    const revenueChange = prevTotalRevenue > 0 
      ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 
      : 0;

    const totalTransactions = sales.length;
    const prevTotalTransactions = prevSales.length;
    const transactionChange = prevTotalTransactions > 0 
      ? ((totalTransactions - prevTotalTransactions) / prevTotalTransactions) * 100 
      : 0;

    const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const prevAvgTicket = prevTotalTransactions > 0 ? prevTotalRevenue / prevTotalTransactions : 0;
    const avgTicketChange = prevAvgTicket > 0 
      ? ((avgTicket - prevAvgTicket) / prevAvgTicket) * 100 
      : 0;

    const days = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const avgDailyRevenue = days > 0 ? totalRevenue / days : 0;
    const prevDays = Math.ceil((prevEndDate.getTime() - prevStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const prevAvgDailyRevenue = prevDays > 0 ? prevTotalRevenue / prevDays : 0;
    const avgDailyChange = prevAvgDailyRevenue > 0 
      ? ((avgDailyRevenue - prevAvgDailyRevenue) / prevAvgDailyRevenue) * 100 
      : 0;

    return {
      success: true,
      data: {
        revenueData,
        salesByChannel,
        salesByDaypart,
        topItems,
        worstItems,
        hourlyData,
        // Comparison metrics for KPI cards
        totalRevenue,
        revenueChange,
        totalTransactions,
        transactionChange,
        avgTicket,
        avgTicketChange,
        avgDailyRevenue,
        avgDailyChange,
      },
    };
  } catch (error) {
    console.error("[getSalesAnalyticsData] Error:", error);
    return { success: false, error: "Failed to fetch sales analytics data" };
  }
}

// Combined function to fetch all dashboard data with date range
export async function getDashboardData(branchIds?: string[], startDate?: Date, endDate?: Date) {
  try {
    const [
      revenueDataResult,
      salesByChannelResult,
      salesByDaypartResult,
      topMenuItemsResult,
      kpiDataResult,
    ] = await Promise.all([
      getRevenueData(branchIds?.[0], startDate, endDate),
      getSalesByChannel(branchIds?.[0], startDate, endDate),
      getSalesByDaypart(branchIds?.[0], startDate, endDate),
      getTopMenuItems(branchIds?.[0], startDate, endDate),
      getKPIData(branchIds, startDate, endDate),
    ]);

    return {
      success: true,
      data: {
        revenueData: revenueDataResult.data || [],
        salesByChannel: salesByChannelResult.data || [],
        salesByDaypart: salesByDaypartResult.data || [],
        topMenuItems: topMenuItemsResult.data?.top || [],
        worstMenuItems: topMenuItemsResult.data?.worst || [],
        kpiData: kpiDataResult.data || {
          totalRevenue: 0,
          revenueGrowth: 0,
          cogsPercentage: 0,
          profitMargin: 0,
          transactionCount: 0,
          averageTicket: 0,
          wasteTotal: 0,
          wasteChange: 0,
        },
      },
    };
  } catch (error) {
    console.error("[getDashboardData] Error:", error);
    return { success: false, error: "Failed to fetch dashboard data" };
  }
}