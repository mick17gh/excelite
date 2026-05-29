import { db } from "@/lib/db";
import type { ReportId } from "@/lib/reports/types";
import type { ReportViewerContext } from "@/lib/reports/auth";
import { taxModeLabel } from "@/lib/reports/tax-labels";
import {
  applyCustomerPiiMask,
  classifyMenuItem,
  dayOfWeekName,
  formatPercentDecimal,
  formatReportDate,
  formatReportDateOnly,
  formatTimeOnly,
  mapOrderSourceLabel,
  prepDurationMinutes,
  roundMoney,
  wowPercent,
} from "@/lib/reports/formatters";
import {
  hourlyRevenueBuckets,
  laborCostFromSchedules,
  peakHourFromBuckets,
  priorYtdRange,
  saleCogs,
  ytdRange,
} from "@/lib/reports/aggregations";
import { getReportExportConfig } from "@/lib/reports/sheet-config";
import { Role } from "@/lib/generated/prisma/client";
import {
  fetchClosedTableSessions,
  fetchWaiterPerformance,
  fetchSectionPerformance,
} from "@/lib/reports/table-aggregations";
import { isTableManagementEnabled } from "@/lib/features/table-management";
import { warehouseOutboundReasonLabel } from "@/lib/inventory/warehouse-outbound";

export interface GenerateReportInput {
  reportId: ReportId;
  branchId?: string;
  startDate: Date;
  endDate: Date;
}

export interface ReportDataPayload {
  reportId: ReportId;
  reportName: string;
  period: { startDate: Date; endDate: Date };
  branchName?: string;
  generatedAt: Date;
  primaryDataKey?: string;
  primarySheetName?: string;
  summary?: Record<string, unknown>;
  [key: string]: unknown;
}

async function organizationIdForBranch(branchId: string | undefined): Promise<string | undefined> {
  if (!branchId) return undefined;
  const b = await db.branch.findUnique({
    where: { id: branchId },
    select: { organizationId: true },
  });
  return b?.organizationId ?? undefined;
}

function exportMeta(reportId: ReportId): { primaryDataKey?: string; primarySheetName?: string } {
  const cfg = getReportExportConfig(reportId);
  return cfg
    ? { primaryDataKey: cfg.primaryDataKey, primarySheetName: cfg.primarySheetName }
    : {};
}

function staffDisplayName(s: { firstName: string; lastName: string } | null | undefined): string {
  return s ? `${s.firstName} ${s.lastName}`.trim() : "";
}

async function branchOperatingExpenses(
  branchIds: string[],
  start: Date,
  end: Date
): Promise<Record<string, number>> {
  if (branchIds.length === 0) return {};
  const rows = await db.operatingExpense.findMany({
    where: {
      branchId: { in: branchIds },
      periodStart: { lte: end },
      periodEnd: { gte: start },
    },
  });
  const map: Record<string, number> = {};
  rows.forEach((r) => {
    map[r.branchId] = (map[r.branchId] || 0) + Number(r.amount);
  });
  return map;
}

export async function buildReportData(
  input: GenerateReportInput,
  viewer: ReportViewerContext
): Promise<ReportDataPayload> {
  const branchFilter = input.branchId ? { branchId: input.branchId } : {};
  const branch = input.branchId
    ? await db.branch.findUnique({ where: { id: input.branchId } })
    : null;

  const base: ReportBase = {
    reportId: input.reportId,
    period: { startDate: input.startDate, endDate: input.endDate },
    branchName: branch?.name || "All Branches",
    generatedAt: new Date(),
    ...exportMeta(input.reportId),
  };

  switch (input.reportId) {
    case "executive-summary":
      return buildExecutiveSummary(input, base);
    case "weekly-performance":
      return buildWeeklyPerformance(input, base, branchFilter);
    case "kitchen-efficiency":
      return buildKitchenEfficiency(input, base, branchFilter);
    case "menu-performance":
      return buildMenuPerformance(input, base, branchFilter);
    case "waste-variance":
      return buildWasteVariance(input, base, branchFilter);
    case "customer-insights":
      return buildCustomerInsights(input, base, branchFilter, viewer.role);
    case "cash-transactions":
      return buildPosTerminal(input, base, branchFilter);
    case "sales-report":
      return buildSalesReport(input, base, branchFilter);
    case "inventory-report":
      return buildInventoryReport(input, base, branchFilter);
    case "warehouse-stock":
      return buildWarehouseStock(input, base);
    case "warehouse-activity":
      return buildWarehouseActivity(input, base);
    case "orders-overview":
      return buildOrdersOverview(input, base, branchFilter, viewer.role);
    case "staff-report":
      return buildStaffReport(input, base, branchFilter);
    case "manual-entries":
      return buildManualEntries(input, base, branchFilter);
    case "pos-sales-report":
      return buildPosSalesReport(input, base, branchFilter);
    case "dine-in-service":
      return buildDineInServiceReport(input, base, branchFilter);
    case "waiter-performance":
      return buildWaiterPerformanceReport(input, base, branchFilter);
    case "table-section-performance":
      return buildTableSectionPerformanceReport(input, base, branchFilter);
    default:
      throw new Error("Report type not implemented");
  }
}

type ReportBase = Omit<ReportDataPayload, "reportName" | "summary">;

function mergeReport(
  base: ReportBase,
  payload: { reportName: string; summary?: Record<string, unknown> } & Record<string, unknown>
): ReportDataPayload {
  return { ...base, ...payload } as ReportDataPayload;
}

async function buildExecutiveSummary(
  input: GenerateReportInput,
  base: ReportBase
): Promise<ReportDataPayload> {
  const branchWhere = input.branchId
    ? { id: input.branchId, isActive: true, deletedAt: null }
    : { isActive: true, deletedAt: null };

  const branches = await db.branch.findMany({
    where: branchWhere,
    select: { id: true, name: true, seatCount: true },
  });
  const branchIds = branches.map((b) => b.id);

  const ytd = ytdRange(input.endDate);
  const priorYtd = priorYtdRange(input.endDate);

  const [periodSales, ytdSales, priorYtdSales, periodOrders, opexMap] = await Promise.all([
    db.sale.findMany({
      where: {
        deletedAt: null,
        branchId: { in: branchIds },
        saleDate: { gte: input.startDate, lte: input.endDate },
      },
      include: { items: true },
    }),
    db.sale.findMany({
      where: {
        deletedAt: null,
        branchId: { in: branchIds },
        saleDate: { gte: ytd.start, lte: ytd.end },
      },
    }),
    db.sale.findMany({
      where: {
        deletedAt: null,
        branchId: { in: branchIds },
        saleDate: { gte: priorYtd.start, lte: priorYtd.end },
      },
    }),
    db.order.findMany({
      where: {
        branchId: { in: branchIds },
        createdAt: { gte: input.startDate, lte: input.endDate },
        customerId: { not: null },
      },
      select: { branchId: true, customerId: true },
    }),
    branchOperatingExpenses(branchIds, input.startDate, input.endDate),
  ]);

  const ytdByBranch: Record<string, number> = {};
  ytdSales.forEach((s) => {
    ytdByBranch[s.branchId] = (ytdByBranch[s.branchId] || 0) + Number(s.total);
  });
  const priorYtdByBranch: Record<string, number> = {};
  priorYtdSales.forEach((s) => {
    priorYtdByBranch[s.branchId] = (priorYtdByBranch[s.branchId] || 0) + Number(s.total);
  });

  const totalYtdRevenue = Object.values(ytdByBranch).reduce((a, b) => a + b, 0);

  const customersByBranch: Record<string, Set<string>> = {};
  const repeatByBranch: Record<string, Set<string>> = {};
  const orderCountByCustomer: Record<string, number> = {};
  periodOrders.forEach((o) => {
    if (!o.customerId) return;
    if (!customersByBranch[o.branchId]) customersByBranch[o.branchId] = new Set();
    customersByBranch[o.branchId].add(o.customerId);
    const key = `${o.branchId}:${o.customerId}`;
    orderCountByCustomer[key] = (orderCountByCustomer[key] || 0) + 1;
  });
  Object.entries(orderCountByCustomer).forEach(([key, count]) => {
    if (count > 1) {
      const [branchId, customerId] = key.split(":");
      if (!repeatByBranch[branchId]) repeatByBranch[branchId] = new Set();
      repeatByBranch[branchId].add(customerId);
    }
  });

  const salesByBranch: Record<
    string,
    { revenue: number; tax: number; cogs: number; transactions: number }
  > = {};
  periodSales.forEach((sale) => {
    if (!salesByBranch[sale.branchId]) {
      salesByBranch[sale.branchId] = { revenue: 0, tax: 0, cogs: 0, transactions: 0 };
    }
    salesByBranch[sale.branchId].revenue += Number(sale.total);
    salesByBranch[sale.branchId].tax += Number(sale.tax);
    salesByBranch[sale.branchId].cogs += saleCogs(sale.items);
    salesByBranch[sale.branchId].transactions += 1;
  });

  const executiveRows = branches.map((b) => {
    const agg = salesByBranch[b.id] || { revenue: 0, tax: 0, cogs: 0, transactions: 0 };
    const revenue = roundMoney(agg.revenue);
    const taxCollected = roundMoney(agg.tax);
    const cogs = roundMoney(agg.cogs);
    const grossProfit = roundMoney(revenue - cogs);
    const opEx = roundMoney(opexMap[b.id] || 0);
    const netProfit = roundMoney(grossProfit - opEx);
    const ytdRev = ytdByBranch[b.id] || 0;
    const priorYtdRev = priorYtdByBranch[b.id] || 0;
    const custSet = customersByBranch[b.id];
    const repeatSet = repeatByBranch[b.id];
    const customerCount = custSet?.size || 0;
    const repeatCount = repeatSet?.size || 0;

    return {
      "Branch Name": b.name,
      "Revenue (GHS)": revenue,
      "Tax Collected (GHS)": taxCollected,
      COGS: cogs,
      "Gross Profit": grossProfit,
      "Gross Margin %": formatPercentDecimal(grossProfit, revenue),
      "Operating Expenses": opEx,
      "Net Profit": netProfit,
      "Net Margin %": formatPercentDecimal(netProfit, revenue),
      Transactions: agg.transactions,
      "AOV (GHS)": agg.transactions ? roundMoney(revenue / agg.transactions) : 0,
      "Branch Contribution %": formatPercentDecimal(revenue, totalYtdRevenue || revenue),
      "YTD Growth %": formatPercentDecimal(ytdRev - priorYtdRev, priorYtdRev || ytdRev),
      "Customer Count": customerCount,
      "Repeat Customer %": formatPercentDecimal(repeatCount, customerCount),
    };
  });

  const totalRevenue = executiveRows.reduce((s, r) => s + (r["Revenue (GHS)"] as number), 0);

  return mergeReport(base, {
    reportName: "Executive Performance & Insight",
    summary: {
      totalRevenue: roundMoney(totalRevenue),
      branchCount: branches.length,
      periodLabel: `${formatReportDateOnly(input.startDate)} – ${formatReportDateOnly(input.endDate)}`,
    },
    executiveRows,
  });
}

async function buildWeeklyPerformance(
  input: GenerateReportInput,
  base: ReportBase,
  branchFilter: { branchId?: string }
): Promise<ReportDataPayload> {
  const [sales, orders, schedules, voidTxs, staffActive] = await Promise.all([
    db.sale.findMany({
      where: {
        deletedAt: null,
        ...branchFilter,
        saleDate: { gte: input.startDate, lte: input.endDate },
      },
    }),
    db.order.findMany({
      where: {
        ...branchFilter,
        createdAt: { gte: input.startDate, lte: input.endDate },
      },
      select: {
        createdAt: true,
        total: true,
        paymentStatus: true,
        status: true,
      },
    }),
    db.staffSchedule.findMany({
      where: {
        ...branchFilter,
        scheduledDate: { gte: input.startDate, lte: input.endDate },
      },
      include: { staff: true },
    }),
    db.transaction.findMany({
      where: {
        ...branchFilter,
        transactionDate: { gte: input.startDate, lte: input.endDate },
        isVoided: true,
      },
    }),
    db.staff.count({
      where: { isActive: true, deletedAt: null, ...branchFilter },
    }),
  ]);

  const priorWeekStart = new Date(input.startDate);
  priorWeekStart.setDate(priorWeekStart.getDate() - 7);
  const priorWeekEnd = new Date(input.endDate);
  priorWeekEnd.setDate(priorWeekEnd.getDate() - 7);

  const priorSales = await db.sale.findMany({
    where: {
      deletedAt: null,
      ...branchFilter,
      saleDate: { gte: priorWeekStart, lte: priorWeekEnd },
    },
  });

  const dailySales: Record<string, typeof sales> = {};
  sales.forEach((s) => {
    const key = s.saleDate.toISOString().split("T")[0];
    if (!dailySales[key]) dailySales[key] = [];
    dailySales[key].push(s);
  });

  const priorDaily: Record<string, number> = {};
  priorSales.forEach((s) => {
    const key = s.saleDate.toISOString().split("T")[0];
    priorDaily[key] = (priorDaily[key] || 0) + Number(s.total);
  });

  const dailyOrders: Record<string, typeof orders> = {};
  orders.forEach((o) => {
    const key = o.createdAt.toISOString().split("T")[0];
    if (!dailyOrders[key]) dailyOrders[key] = [];
    dailyOrders[key].push(o);
  });

  const schedulesByDay: Record<string, typeof schedules> = {};
  schedules.forEach((sc) => {
    const key = sc.scheduledDate.toISOString().split("T")[0];
    if (!schedulesByDay[key]) schedulesByDay[key] = [];
    schedulesByDay[key].push(sc);
  });

  const weeklyDigestRows: Record<string, unknown>[] = [];
  const cursor = new Date(input.startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(input.endDate);
  end.setHours(23, 59, 59, 999);

  while (cursor <= end) {
    const dateKey = cursor.toISOString().split("T")[0];
    const daySales = dailySales[dateKey] || [];
    const totalSales = roundMoney(daySales.reduce((s, x) => s + Number(x.total), 0));
    const dayTax = roundMoney(daySales.reduce((s, x) => s + Number(x.tax), 0));
    const priorKey = new Date(cursor);
    priorKey.setDate(priorKey.getDate() - 7);
    const priorKeyStr = priorKey.toISOString().split("T")[0];
    const priorTotal = priorDaily[priorKeyStr] || 0;

    const buckets = hourlyRevenueBuckets(daySales);
    const peak = peakHourFromBuckets(buckets);
    const daySchedules = schedulesByDay[dateKey] || [];
    const laborCost = laborCostFromSchedules(daySchedules);
    const dayOrders = dailyOrders[dateKey] || [];
    const voidRefundCount =
      dayOrders.filter(
        (o) =>
          o.paymentStatus === "REFUNDED" ||
          o.paymentStatus === "FAILED" ||
          o.status === "CANCELLED"
      ).length +
      voidTxs.filter((t) => t.transactionDate.toISOString().split("T")[0] === dateKey).length;

    const staffCount = Math.max(staffActive, daySchedules.length ? new Set(daySchedules.map((s) => s.staffId)).size : 1);

    weeklyDigestRows.push({
      Date: formatReportDateOnly(cursor),
      "Day of Week": dayOfWeekName(cursor),
      "Total Sales": totalSales,
      "Tax (GHS)": dayTax,
      "WoW Growth %": wowPercent(totalSales, priorTotal) / 100,
      "Best Selling Hour": `${String(peak.hour).padStart(2, "0")}:00`,
      "Peak Hour Revenue": peak.revenue,
      "Labor Cost": laborCost,
      "Total Orders": dayOrders.length || daySales.length,
      "Staff Efficiency": staffCount ? roundMoney(totalSales / staffCount) : 0,
      "Void/Refund Count": voidRefundCount,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return mergeReport(base, {
    reportName: "Weekly Performance Digest",
    summary: {
      daysInReport: weeklyDigestRows.length,
      totalSales: roundMoney(weeklyDigestRows.reduce((s, r) => s + (r["Total Sales"] as number), 0)),
    },
    weeklyDigestRows,
  });
}

async function buildKitchenEfficiency(
  input: GenerateReportInput,
  base: ReportBase,
  branchFilter: { branchId?: string }
): Promise<ReportDataPayload> {
  const stationWhere = input.branchId ? { branchId: input.branchId } : {};
  const orgId = await organizationIdForBranch(input.branchId);
  const org = orgId
    ? await db.organization.findUnique({
        where: { id: orgId },
        select: { estimatedPrepTime: true },
      })
    : null;
  const sla = org?.estimatedPrepTime ?? 15;

  const tickets = await db.kitchenTicket.findMany({
    where: {
      completedAt: { gte: input.startDate, lte: input.endDate },
      status: "COMPLETED",
      station: stationWhere,
    },
    include: {
      order: {
        select: {
          orderNumber: true,
          source: true,
          orderReceivedTime: true,
          closedAt: true,
          branch: { select: { name: true } },
        },
      },
    },
    orderBy: { completedAt: "desc" },
    take: 2000,
  });

  const kitchenRows = tickets
    .filter((t) => t.completedAt)
    .map((t) => {
      const receipt = t.order.orderReceivedTime || t.createdAt;
      const ready = t.completedAt!;
      const prep = prepDurationMinutes(receipt, ready);
      const variance = prep - sla;
      return {
        "Order ID": t.order.orderNumber,
        Branch: t.order.branch?.name || "",
        "Order Method": mapOrderSourceLabel(t.order.source),
        "Kitchen Receipt Time": formatTimeOnly(receipt),
        "Food Ready Time": formatTimeOnly(ready),
        "Prep Duration (Mins)": prep,
        "Target Time (SLA)": sla,
        "Variance (+/- Mins)": variance,
        "Order Status": variance > 0 ? "Delayed" : "Completed",
      };
    });

  const prepTimes = kitchenRows.map((r) => r["Prep Duration (Mins)"] as number);
  const avgPrep = prepTimes.length
    ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length)
    : 0;
  const onTime = kitchenRows.filter((r) => (r["Variance (+/- Mins)"] as number) <= 0).length;
  const hourlyCounts: Record<number, number> = {};
  tickets.forEach((t) => {
    if (!t.completedAt) return;
    const h = t.completedAt.getHours();
    hourlyCounts[h] = (hourlyCounts[h] || 0) + 1;
  });
  const counts = Object.values(hourlyCounts);
  const avgHourly = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 1;
  const peakHour = Math.max(...counts, 0);
  const peakMultiple = avgHourly ? roundMoney(peakHour / avgHourly) : 0;

  return mergeReport(base, {
    reportName: "Kitchen & Operational Efficiency",
    summary: {
      ticketsAnalyzed: kitchenRows.length,
      averagePrepTimeMins: avgPrep,
      orderAccuracyPct: formatPercentDecimal(onTime, kitchenRows.length),
      peakHourPrepMultiple: peakMultiple,
    },
    kitchenRows,
  });
}

async function buildMenuPerformance(
  input: GenerateReportInput,
  base: ReportBase,
  branchFilter: { branchId?: string }
): Promise<ReportDataPayload> {
  const sales = await db.sale.findMany({
    where: {
      deletedAt: null,
      ...branchFilter,
      saleDate: { gte: input.startDate, lte: input.endDate },
    },
    include: {
      items: {
        include: {
          menuItem: { include: { category: true } },
        },
      },
    },
  });

  const itemAgg: Record<
    string,
    {
      name: string;
      category: string;
      qty: number;
      unitCost: number;
      unitPrice: number;
      orderIds: Set<string>;
      ordersWithAddon: Set<string>;
    }
  > = {};

  const drinkCategories = new Set(["drink", "drinks", "side", "sides", "beverage", "beverages"]);

  sales.forEach((sale) => {
    const saleHasAddon = sale.items.some((it) => {
      const cat = it.menuItem?.category?.name?.toLowerCase() || "";
      return drinkCategories.has(cat);
    });
    sale.items.forEach((it) => {
      const id = it.menuItemId;
      const unitCost = Number(it.unitCost);
      const unitPrice = Number(it.unitPrice);
      if (!itemAgg[id]) {
        itemAgg[id] = {
          name: it.menuItem?.name || "Unknown",
          category: it.menuItem?.category?.name || "Uncategorized",
          qty: 0,
          unitCost,
          unitPrice,
          orderIds: new Set(),
          ordersWithAddon: new Set(),
        };
      }
      itemAgg[id].qty += Number(it.quantity);
      itemAgg[id].orderIds.add(sale.id);
      if (saleHasAddon) itemAgg[id].ordersWithAddon.add(sale.id);
    });
  });

  const items = Object.values(itemAgg).map((i) => {
    const totalProfit = roundMoney((i.unitPrice - i.unitCost) * i.qty);
    const profitPct = i.unitPrice ? formatPercentDecimal(i.unitPrice - i.unitCost, i.unitPrice) : 0;
    const addonRate = formatPercentDecimal(i.ordersWithAddon.size, i.orderIds.size);
    return {
      name: i.name,
      category: i.category,
      qty: i.qty,
      unitCost: roundMoney(i.unitCost),
      unitPrice: roundMoney(i.unitPrice),
      totalProfit,
      profitPct,
      addonRate,
    };
  });

  const medianProfit =
    items.length > 0
      ? [...items.map((i) => i.profitPct)].sort((a, b) => a - b)[Math.floor(items.length / 2)]
      : 0;
  const medianQty =
    items.length > 0
      ? [...items.map((i) => i.qty)].sort((a, b) => a - b)[Math.floor(items.length / 2)]
      : 0;

  const menuRows = items
    .sort((a, b) => b.totalProfit - a.totalProfit)
    .map((i) => ({
      "Item Name": i.name,
      Category: i.category,
      "Quantity Sold": i.qty,
      "Unit Cost": i.unitCost,
      "Unit Price": i.unitPrice,
      "Total Profit": i.totalProfit,
      "Profit %": i.profitPct,
      "Add on Rate %": i.addonRate,
      Rank: classifyMenuItem(i.profitPct, i.qty, medianProfit, medianQty),
    }));

  return mergeReport(base, {
    reportName: "Menu Performance Report",
    summary: {
      itemsAnalyzed: menuRows.length,
      topItem: menuRows[0]?.["Item Name"] || "—",
    },
    menuRows,
  });
}

async function buildWasteVariance(
  input: GenerateReportInput,
  base: ReportBase,
  branchFilter: { branchId?: string }
): Promise<ReportDataPayload> {
  const [stockCounts, wasteLogs, salesSum] = await Promise.all([
    db.inventoryStockCount.findMany({
      where: {
        ...branchFilter,
        countedAt: { gte: input.startDate, lte: input.endDate },
      },
      include: { item: true },
    }),
    db.wasteLog.findMany({
      where: {
        ...branchFilter,
        wasteDate: { gte: input.startDate, lte: input.endDate },
      },
      include: { item: true },
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

  const totalSales = Number(salesSum._sum.total) || 0;
  let wasteVarianceRows: Record<string, unknown>[] = [];
  let estimateNote = "";

  if (stockCounts.length > 0) {
    wasteVarianceRows = stockCounts.map((c) => {
      const expected = Number(c.expectedQty);
      const actual = Number(c.actualQty);
      const variance = expected - actual;
      const unitCost = Number(c.item.unitCost);
      return {
        "Item Name": c.item.name,
        "Expected Qty": expected,
        "Actual Count": actual,
        "Variance Amount": variance,
        "Variance %": formatPercentDecimal(variance, expected),
        "Waste Reason": c.wasteReason || "—",
        "Loss Value (GHS)": roundMoney(variance * unitCost),
        "Staff ID": c.recordedBy || "—",
      };
    });
  } else {
    estimateNote = "No physical stock counts in period; rows from waste logs.";
    wasteVarianceRows = wasteLogs.map((w) => {
      const qty = Number(w.quantity);
      return {
        "Item Name": w.item?.name || "Unknown",
        "Expected Qty": qty,
        "Actual Count": 0,
        "Variance Amount": qty,
        "Variance %": 1,
        "Waste Reason": w.reason,
        "Loss Value (GHS)": roundMoney(Number(w.totalCost)),
        "Staff ID": w.recordedBy || "—",
      };
    });
  }

  const totalWasteCost = wasteVarianceRows.reduce(
    (s, r) => s + (r["Loss Value (GHS)"] as number),
    0
  );

  return mergeReport(base, {
    reportName: "Waste & Variance Report",
    summary: {
      totalWasteCost: roundMoney(totalWasteCost),
      wasteCostRatio: formatPercentDecimal(totalWasteCost, totalSales),
      rowCount: wasteVarianceRows.length,
      note: estimateNote,
    },
    wasteVarianceRows,
  });
}

async function buildCustomerInsights(
  input: GenerateReportInput,
  base: ReportBase,
  branchFilter: { branchId?: string },
  role: Role
): Promise<ReportDataPayload> {
  const customers = await db.customer.findMany({
    where: { isActive: true },
    include: {
      orders: {
        where: {
          ...branchFilter,
        },
        include: {
          delivery: true,
          branch: { select: { name: true } },
        },
      },
    },
  });

  const cohortStart = input.startDate;
  const cohortEnd = input.endDate;
  let returningInPeriod = 0;
  let totalInPeriod = 0;

  const customerRows = customers
    .map((c) => {
      const orders = c.orders;
      if (orders.length === 0) return null;

      const lifetimeSpend = roundMoney(orders.reduce((s, o) => s + Number(o.total), 0));
      const lastOrder = orders.reduce(
        (latest, o) => (o.createdAt > latest ? o.createdAt : latest),
        orders[0].createdAt
      );
      const deliveryFees = roundMoney(orders.reduce((s, o) => s + Number(o.deliveryFee), 0));

      const doorTimes: number[] = [];
      orders.forEach((o) => {
        if (o.delivery?.actualDeliveryTime) {
          const start = o.orderReceivedTime || o.createdAt;
          doorTimes.push(
            (o.delivery.actualDeliveryTime.getTime() - start.getTime()) / 60000
          );
        }
      });
      const avgDoor =
        doorTimes.length > 0
          ? `${Math.round(doorTimes.reduce((a, b) => a + b, 0) / doorTimes.length)} mins`
          : "—";

      const zone =
        orders.find((o) => o.deliveryNeighborhood)?.deliveryNeighborhood ||
        orders.find((o) => o.delivery?.neighborhood)?.delivery?.neighborhood ||
        c.city ||
        "—";

      const ordersInPeriod = orders.filter(
        (o) => o.createdAt >= cohortStart && o.createdAt <= cohortEnd
      );
      if (ordersInPeriod.length > 0) {
        totalInPeriod += 1;
        if (ordersInPeriod.length > 1) returningInPeriod += 1;
      }

      const periodOrders = orders.filter(
        (o) => o.createdAt >= cohortStart && o.createdAt <= cohortEnd
      );
      const retention =
        orders.length > 1 ? formatPercentDecimal(orders.length - 1, orders.length) : 0;

      const row = {
        "Customer Name": c.name,
        "Phone Number": c.phone,
        "Delivery Zone": zone,
        "Total Lifetime Spend": lifetimeSpend,
        "Last Visit Date": formatReportDateOnly(lastOrder),
        "Average Order-to-Door Time": avgDoor,
        "Retention Rate %": retention,
        "Delivery Fee Revenue": deliveryFees,
      };
      return applyCustomerPiiMask(row, role);
    })
    .filter(Boolean) as Record<string, unknown>[];

  customerRows.sort(
    (a, b) => (b["Total Lifetime Spend"] as number) - (a["Total Lifetime Spend"] as number)
  );

  return mergeReport(base, {
    reportName: "Customer Insights",
    summary: {
      customersWithOrders: customerRows.length,
      cohortRetentionRate: formatPercentDecimal(returningInPeriod, totalInPeriod),
    },
    customerRows,
  });
}

async function buildPosTerminal(
  input: GenerateReportInput,
  base: ReportBase,
  branchFilter: { branchId?: string }
): Promise<ReportDataPayload> {
  const txs = await db.transaction.findMany({
    where: {
      ...branchFilter,
      transactionDate: { gte: input.startDate, lte: input.endDate },
    },
    include: {
      staff: true,
      terminal: true,
      sale: { select: { id: true, saleNumber: true } },
    },
    orderBy: { transactionDate: "desc" },
  });

  const posTerminalRows = txs.map((t, idx) => {
    const isMomo = /momo|mtn|telecel|mobile/i.test(t.paymentMethod);
    const momoRef = isMomo ? t.transactionRef : "N/A";
    return {
      "Terminal ID": t.terminal?.code || `POS-${(idx % 8) + 1}`,
      "Staff Name": staffDisplayName(t.staff),
      "Payment Type": t.paymentMethod,
      "MoMo Reference ID": momoRef,
      "Success/Fail Status": t.isVoided ? "Fail" : "Success",
      Amount: roundMoney(Number(t.amount)),
    };
  });

  const byMethod: Record<string, number> = {};
  let total = 0;
  txs.filter((t) => !t.isVoided).forEach((t) => {
    const m = t.paymentMethod;
    byMethod[m] = (byMethod[m] || 0) + Number(t.amount);
    total += Number(t.amount);
  });

  const paymentMix = Object.entries(byMethod).map(([method, amount]) => ({
    "Payment Type": method,
    "Payment Mix %": formatPercentDecimal(amount, total),
    "Amount (GHS)": roundMoney(amount),
  }));

  return mergeReport(base, {
    reportName: "POS Terminal Report",
    summary: {
      transactionCount: txs.length,
      totalAmount: roundMoney(total),
    },
    posTerminalRows,
    paymentMix,
  });
}

// --- Remaining reports (aligned headers) ---

async function buildSalesReport(
  input: GenerateReportInput,
  base: ReportBase,
  branchFilter: { branchId?: string }
): Promise<ReportDataPayload> {
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
  const totalNetSubtotal = sales.reduce((s, x) => s + Number(x.subtotal), 0);

  const salesDetailRows = sales.map((sale) => ({
    "Sale Number": sale.saleNumber,
    Branch: sale.branch?.name || "",
    Date: formatReportDate(sale.saleDate),
    Channel: sale.channel,
    "Tax Mode": taxModeLabel(sale.branch?.taxInclusive ?? false),
    "Net Subtotal (GHS)": roundMoney(Number(sale.subtotal)),
    "Tax (GHS)": roundMoney(Number(sale.tax)),
    "Total Collected (GHS)": roundMoney(Number(sale.total)),
    "Line Items": sale.items.length,
  }));

  return mergeReport(base, {
    reportName: "Sales & Revenue Report",
    summary: {
      totalRevenue: roundMoney(totalRevenue),
      totalNetSubtotal: roundMoney(totalNetSubtotal),
      totalTax: roundMoney(totalTax),
      transactionCount: sales.length,
    },
    salesDetailRows,
  });
}

async function buildInventoryReport(
  input: GenerateReportInput,
  base: ReportBase,
  branchFilter: { branchId?: string }
): Promise<ReportDataPayload> {
  const items = await db.inventoryItem.findMany({
    where: { deletedAt: null, isActive: true, ...branchFilter },
    include: { branch: true, category: { select: { name: true } } },
  });

  const branchInventoryRows = items.map((item) => ({
    "Item Name": item.name,
    Branch: item.branch?.name || "",
    SKU: item.sku,
    Category: item.category.name,
    "Current Stock": Number(item.currentStock),
    "Unit Cost": roundMoney(Number(item.unitCost)),
    "Line Value (GHS)": roundMoney(Number(item.currentStock) * Number(item.unitCost)),
    Status:
      Number(item.currentStock) <= Number(item.reorderPoint)
        ? "Low"
        : Number(item.currentStock) > Number(item.maxStock)
          ? "Overstock"
          : "OK",
  }));

  return mergeReport(base, {
    reportName: "Branch Inventory Status",
    summary: { totalItems: items.length },
    branchInventoryRows,
  });
}

async function buildWarehouseStock(
  input: GenerateReportInput,
  base: ReportBase
): Promise<ReportDataPayload> {
  const orgId = await organizationIdForBranch(input.branchId);
  const warehouseWhere: Record<string, unknown> = { isActive: true };
  if (orgId) warehouseWhere.organizationId = orgId;

  const warehouses = await db.warehouse.findMany({
    where: warehouseWhere,
    select: { id: true, name: true, code: true },
  });
  const whIds = warehouses.map((w) => w.id);

  const items = whIds.length
    ? await db.warehouseInventoryItem.findMany({
        where: { warehouseId: { in: whIds }, isActive: true },
        include: {
          warehouse: { select: { name: true, code: true } },
          category: { select: { name: true } },
        },
        orderBy: [{ warehouseId: "asc" }, { name: "asc" }],
      })
    : [];

  const stockLines = items.map((i) => ({
    Warehouse: i.warehouse?.name || "",
    "Item Name": i.name,
    SKU: i.sku,
    Category: i.category.name,
    "Current Stock": Number(i.currentStock),
    "Unit Cost": roundMoney(Number(i.unitCost)),
    "Line Value (GHS)": roundMoney(Number(i.currentStock) * Number(i.unitCost)),
    Status: Number(i.currentStock) <= Number(i.reorderPoint) ? "Low" : "OK",
  }));

  return mergeReport(base, {
    reportName: "Warehouse Stock Report",
    summary: { lineCount: stockLines.length, warehouseCount: warehouses.length },
    stockLines,
  });
}

async function buildWarehouseActivity(
  input: GenerateReportInput,
  base: ReportBase
): Promise<ReportDataPayload> {
  const orgId = await organizationIdForBranch(input.branchId);
  const warehouseWhere: Record<string, unknown> = { isActive: true };
  if (orgId) warehouseWhere.organizationId = orgId;
  const warehouses = await db.warehouse.findMany({
    where: warehouseWhere,
    select: { id: true },
  });
  const whIds = warehouses.map((w) => w.id);

  const transferWhere: Record<string, unknown> = {
    transferDate: { gte: input.startDate, lte: input.endDate },
  };
  if (whIds.length) transferWhere.warehouseId = { in: whIds };
  if (input.branchId) transferWhere.toBranchId = input.branchId;

  const transfers = await db.warehouseBranchTransfer.findMany({
    where: transferWhere,
    include: {
      warehouse: { select: { name: true } },
      warehouseItem: { select: { name: true, sku: true } },
      toBranch: { select: { name: true } },
    },
    orderBy: { transferDate: "desc" },
  });

  const transferRows = transfers.map((t) => ({
    Date: formatReportDate(t.transferDate),
    Warehouse: t.warehouse?.name || "",
    Item: t.warehouseItem?.name || "",
    "To Branch": t.toBranch?.name || "",
    Quantity: Number(t.quantity),
    "Total Cost (GHS)": roundMoney(Number(t.totalCost)),
    Status: t.status,
  }));

  const outboundWhere: Record<string, unknown> = {
    outboundDate: { gte: input.startDate, lte: input.endDate },
  };
  if (whIds.length) outboundWhere.warehouseId = { in: whIds };

  const outboundLogs = await db.warehouseOutboundLog.findMany({
    where: outboundWhere,
    include: {
      warehouse: { select: { name: true } },
      warehouseItem: { select: { name: true, sku: true, unit: true } },
    },
    orderBy: { outboundDate: "desc" },
  });

  const outboundRows = outboundLogs.map((o) => ({
    Date: formatReportDate(o.outboundDate),
    Warehouse: o.warehouse?.name || "",
    Item: o.warehouseItem?.name || "",
    SKU: o.warehouseItem?.sku || "",
    Unit: o.warehouseItem?.unit || "",
    Quantity: Number(o.quantity),
    Reason: warehouseOutboundReasonLabel(o.reason),
    Notes: o.notes || "—",
    "Unit Cost (GHS)": roundMoney(Number(o.unitCost)),
    "Total Cost (GHS)": roundMoney(Number(o.totalCost)),
  }));

  const totalOutboundCost = outboundRows.reduce(
    (sum, row) => sum + Number(row["Total Cost (GHS)"]),
    0,
  );

  return mergeReport(base, {
    reportName: "Warehouse Activity Report",
    summary: {
      transferCount: transferRows.length,
      outboundCount: outboundRows.length,
      totalOutboundCost: roundMoney(totalOutboundCost),
    },
    transfers: transferRows,
    outbound: outboundRows,
  });
}

async function buildOrdersOverview(
  input: GenerateReportInput,
  base: ReportBase,
  branchFilter: { branchId?: string },
  role: Role
): Promise<ReportDataPayload> {
  const orgId = await organizationIdForBranch(input.branchId);
  const tableModuleOn = orgId ? await isTableManagementEnabled(orgId) : false;

  const orders = await db.order.findMany({
    where: {
      ...branchFilter,
      createdAt: { gte: input.startDate, lte: input.endDate },
    },
    include: {
      branch: {
        select: { name: true, taxInclusive: true },
      },
      tableSession: {
        select: {
          guestCount: true,
          openedAt: true,
          closedAt: true,
          table: { select: { label: true, section: { select: { name: true } } } },
          opener: { select: { name: true } },
        },
      },
      assignedByUser: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const orderRows = orders.map((o) => {
    const session = o.tableSession;
    const durationMin =
      session?.closedAt && session.openedAt
        ? Math.round(
            (session.closedAt.getTime() - session.openedAt.getTime()) / 60000,
          )
        : null;
    const row: Record<string, string | number> = {
      "Order ID": o.orderNumber,
      Date: formatReportDate(o.createdAt),
      Branch: o.branch?.name || "",
      "Order Method": mapOrderSourceLabel(o.source),
      Status: o.status,
      "Payment Status": o.paymentStatus,
      "Customer Name": o.customerName || "—",
      "Tax Mode": taxModeLabel(o.branch?.taxInclusive ?? false),
      "Net Subtotal (GHS)": roundMoney(Number(o.subtotal)),
      "Tax (GHS)": roundMoney(Number(o.tax)),
      "Total (GHS)": roundMoney(Number(o.total)),
    };
    if (tableModuleOn) {
      row.Table = session?.table.label ?? (o.type === "DINE_IN" ? "Counter" : "—");
      row.Section = session?.table.section?.name ?? "—";
      row.Waiter = o.assignedByUser?.name ?? session?.opener?.name ?? "—";
      row.Covers = session?.guestCount ?? "—";
      row["Session (min)"] = durationMin ?? "—";
    }
    return applyCustomerPiiMask(row, role, "Customer Name", "Phone Number");
  });

  return mergeReport(base, {
    reportName: "Orders Overview",
    summary: { orderCount: orders.length },
    orderRows,
  });
}

async function buildStaffReport(
  input: GenerateReportInput,
  base: ReportBase,
  branchFilter: { branchId?: string }
): Promise<ReportDataPayload> {
  const schedules = await db.staffSchedule.findMany({
    where: {
      ...branchFilter,
      scheduledDate: { gte: input.startDate, lte: input.endDate },
    },
    include: { staff: true, branch: true },
  });

  const staffRows = schedules.map((sc) => {
    const hours =
      (sc.shiftEnd.getTime() - sc.shiftStart.getTime()) / (1000 * 60 * 60);
    const laborCost = roundMoney(hours * Number(sc.staff?.hourlyRate || 0));
    return {
      Date: formatReportDateOnly(sc.scheduledDate),
      Branch: sc.branch?.name || "",
      "Staff Name": staffDisplayName(sc.staff),
      Role: sc.staff?.role || "",
      "Scheduled Hours": roundMoney(hours),
      "Labor Cost (GHS)": laborCost,
    };
  });

  const totalLabor = staffRows.reduce((s, r) => s + (r["Labor Cost (GHS)"] as number), 0);

  return mergeReport(base, {
    reportName: "Staff Scheduling Report",
    summary: {
      scheduledShifts: schedules.length,
      totalLaborCost: roundMoney(totalLabor),
    },
    staffRows,
  });
}

async function buildManualEntries(
  input: GenerateReportInput,
  base: ReportBase,
  branchFilter: { branchId?: string }
): Promise<ReportDataPayload> {
  const batches = await db.manualEntryBatch.findMany({
    where: {
      ...branchFilter,
      periodStart: { lte: input.endDate },
      periodEnd: { gte: input.startDate },
    },
    include: { branch: true, lines: true },
    orderBy: { periodStart: "desc" },
  });

  const manualEntryRows = batches.flatMap((batch) =>
    batch.lines.map((line) => ({
      Branch: batch.branch?.name || "",
      "Period Start": formatReportDateOnly(batch.periodStart),
      "Period End": formatReportDateOnly(batch.periodEnd),
      Channel: line.channel,
      "Revenue (GHS)": roundMoney(Number(line.totalRevenue)),
      Transactions: line.transactionCount,
    }))
  );

  return mergeReport(base, {
    reportName: "Manual Entries Report",
    summary: { batchCount: batches.length },
    manualEntryRows,
  });
}

async function buildPosSalesReport(
  input: GenerateReportInput,
  base: ReportBase,
  branchFilter: { branchId?: string }
): Promise<ReportDataPayload> {
  const posOrders = await db.posOrder.findMany({
    where: {
      ...branchFilter,
      openedAt: { gte: input.startDate, lte: input.endDate },
    },
    include: { branch: true },
    orderBy: { openedAt: "desc" },
  });

  const posTicketRows = posOrders.map((o) => ({
    "Order Number": o.orderNumber,
    Date: formatReportDate(o.openedAt),
    Branch: o.branch?.name || "",
    Channel: o.sourceChannel,
    Type: o.type,
    Status: o.status,
    "Payment Method": o.paymentMethod || "—",
    "Tax Mode": taxModeLabel(o.branch?.taxInclusive ?? false),
    "Net Subtotal (GHS)": roundMoney(Number(o.subtotal)),
    "Tax (GHS)": roundMoney(Number(o.tax)),
    "Total (GHS)": roundMoney(Number(o.total)),
  }));

  return mergeReport(base, {
    reportName: "POS Terminal Sales",
    summary: { ticketCount: posOrders.length },
    posTicketRows,
  });
}

async function buildDineInServiceReport(
  input: GenerateReportInput,
  base: ReportBase,
  branchFilter: { branchId?: string },
): Promise<ReportDataPayload> {
  const sessions = await fetchClosedTableSessions({
    branchId: branchFilter.branchId,
    startDate: input.startDate,
    endDate: input.endDate,
  });

  const totalRevenue = sessions.reduce((s, r) => s + r.revenue, 0);
  const totalCovers = sessions.reduce((s, r) => s + r.covers, 0);
  const avgTurn =
    sessions.length > 0
      ? Math.round(
          sessions.reduce((s, r) => s + r.durationMinutes, 0) / sessions.length,
        )
      : 0;

  const sessionRows = sessions.map((r) => ({
    Branch: r.branchName,
    Section: r.sectionName,
    Table: r.tableLabel,
    Waiter: r.waiterName,
    Covers: r.covers,
    Orders: r.orderCount,
    "Revenue (GHS)": r.revenue,
    "Duration (min)": r.durationMinutes,
    Opened: formatReportDate(r.openedAt),
    Closed: formatReportDate(r.closedAt),
  }));

  return mergeReport(base, {
    reportName: "Dine-In & Table Service",
    summary: {
      sessions: sessions.length,
      covers: totalCovers,
      dineInRevenue: roundMoney(totalRevenue),
      revenuePerCover: totalCovers > 0 ? roundMoney(totalRevenue / totalCovers) : 0,
      avgTurnMinutes: avgTurn,
    },
    sessionRows,
  });
}

async function buildWaiterPerformanceReport(
  input: GenerateReportInput,
  base: ReportBase,
  branchFilter: { branchId?: string },
): Promise<ReportDataPayload> {
  const waiterRows = await fetchWaiterPerformance({
    branchId: branchFilter.branchId,
    startDate: input.startDate,
    endDate: input.endDate,
  });

  return mergeReport(base, {
    reportName: "Waiter Performance",
    summary: { waiterCount: waiterRows.length },
    waiterRows,
  });
}

async function buildTableSectionPerformanceReport(
  input: GenerateReportInput,
  base: ReportBase,
  branchFilter: { branchId?: string },
): Promise<ReportDataPayload> {
  const sectionRows = await fetchSectionPerformance({
    branchId: branchFilter.branchId,
    startDate: input.startDate,
    endDate: input.endDate,
  });

  return mergeReport(base, {
    reportName: "Table Section Performance",
    summary: { sectionCount: sectionRows.length },
    sectionRows,
  });
}
