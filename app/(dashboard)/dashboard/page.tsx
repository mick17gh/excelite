import { Suspense } from "react";
import { DashboardWrapper } from "@/components/dashboard/dashboard-wrapper";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { getRevenueData, getTopMenuItems, getKPIData } from "@/lib/actions/transactions";
import { db } from "@/lib/db";
import { loadSessionAccess } from "@/lib/permissions/load-session-access";
import { endOfDay, format, startOfDay } from "date-fns";

export const metadata = {
  title: "Dashboard",
  description: "Your daily sales overview",
};

export default function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<DashboardPageSkeleton kpiCount={4} />}>
      <DashboardPageData searchParams={searchParams} />
    </Suspense>
  );
}

interface DashboardPageDataProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function parseDashboardRange(
  fromRaw?: string | string[],
  toRaw?: string | string[],
) {
  const fromValue = Array.isArray(fromRaw) ? fromRaw[0] : fromRaw;
  const toValue = Array.isArray(toRaw) ? toRaw[0] : toRaw;

  const parseDateParam = (value?: string) => {
    if (!value) return new Date();
    const dateKeyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateKeyMatch) {
      const [, y, m, d] = dateKeyMatch;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    return new Date(value);
  };

  const parsedFrom = parseDateParam(fromValue);
  const parsedTo = parseDateParam(toValue ?? fromValue);

  const from = Number.isNaN(parsedFrom.getTime())
    ? startOfDay(new Date())
    : startOfDay(parsedFrom);
  const to = Number.isNaN(parsedTo.getTime()) ? endOfDay(from) : endOfDay(parsedTo);

  if (to.getTime() < from.getTime()) {
    return { from, to: endOfDay(from) };
  }

  return { from, to };
}

async function DashboardPageData({ searchParams }: DashboardPageDataProps) {
  const resolvedSearchParams = await searchParams;
  const access = await loadSessionAccess();
  const organizationId = access?.organizationId;
  const { from: rangeStart, to: rangeEnd } = parseDashboardRange(
    resolvedSearchParams?.from,
    resolvedSearchParams?.to,
  );
  const dateRangeLabel =
    format(rangeStart, "MMM d, yyyy") === format(rangeEnd, "MMM d, yyyy")
      ? format(rangeStart, "MMM d, yyyy")
      : `${format(rangeStart, "MMM d, yyyy")} - ${format(rangeEnd, "MMM d, yyyy")}`;

  const [revenueDataResult, topMenuItemsResult, kpiDataResult, ordersResult, lowStockItems] =
    await Promise.all([
      getRevenueData(undefined, rangeStart, rangeEnd),
      getTopMenuItems(undefined, rangeStart, rangeEnd),
      getKPIData(undefined, rangeStart, rangeEnd),
      db.order.findMany({
        where: {
          createdAt: { gte: rangeStart, lte: rangeEnd },
          ...(organizationId ? { branch: { organizationId, deletedAt: null } } : {}),
        },
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      organizationId
        ? db.inventoryItem.findMany({
            where: {
              branch: { organizationId, deletedAt: null },
              deletedAt: null,
              isActive: true,
            },
            select: {
              name: true,
              currentStock: true,
              reorderPoint: true,
            },
            take: 50,
          })
        : Promise.resolve([]),
    ]);

  const revenueData = revenueDataResult.data || [];
  const menuItemsData = topMenuItemsResult.data || { top: [], worst: [] };
  const kpiDataRaw = kpiDataResult.data || {
    totalRevenue: 0,
    revenueGrowth: 0,
    transactionCount: 0,
    transactionChange: 0,
    averageTicket: 0,
    averageTicketChange: 0,
  };
  const orders = ordersResult || [];

  const lowStock = lowStockItems
    .filter((item) => Number(item.currentStock) <= Number(item.reorderPoint))
    .map((item) => ({
      name: item.name,
      quantity: Number(item.currentStock),
      reorderLevel: Number(item.reorderPoint),
    }))
    .sort((a, b) => a.quantity - b.quantity);

  const recentOrders = orders
    .slice(0, 8)
    .map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      status: order.status,
    }));

  return (
    <DashboardWrapper
      revenueData={revenueData}
      topMenuItems={menuItemsData.top || []}
      worstMenuItems={menuItemsData.worst || []}
      lowStockItems={lowStock}
      recentOrders={recentOrders}
      selectedDateRange={{
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString(),
      }}
      dateRangeLabel={dateRangeLabel}
      kpiData={{
        totalRevenue: kpiDataRaw.totalRevenue,
        revenueGrowth: kpiDataRaw.revenueGrowth,
        transactionCount: kpiDataRaw.transactionCount,
        transactionChange: kpiDataRaw.transactionChange,
        averageTicket: kpiDataRaw.averageTicket,
        averageTicketChange: kpiDataRaw.averageTicketChange,
      }}
    />
  );
}
