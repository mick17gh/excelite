import { Suspense } from "react";
import { DashboardWrapper } from "@/components/dashboard/dashboard-wrapper";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { getRevenueData, getTopMenuItems, getKPIData } from "@/lib/actions/transactions";
import { getOrders } from "@/lib/actions/orders";
import { db } from "@/lib/db";
import { loadSessionAccess } from "@/lib/permissions/load-session-access";
import { subDays, startOfDay } from "date-fns";

export const metadata = {
  title: "Dashboard",
  description: "Your daily sales overview",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton kpiCount={4} />}>
      <DashboardPageData />
    </Suspense>
  );
}

async function DashboardPageData() {
  const access = await loadSessionAccess();
  const organizationId = access?.organizationId;
  const todayStart = startOfDay(new Date());
  const weekStart = subDays(new Date(), 7);

  const [revenueDataResult, topMenuItemsResult, kpiDataResult, ordersResult, lowStockItems] =
    await Promise.all([
      getRevenueData(undefined, weekStart, new Date()),
      getTopMenuItems(),
      getKPIData(),
      getOrders({ pageSize: 8 }),
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
  const orders = ordersResult.data || [];

  const lowStock = lowStockItems
    .filter((item) => Number(item.currentStock) <= Number(item.reorderPoint))
    .map((item) => ({
      name: item.name,
      quantity: Number(item.currentStock),
      reorderLevel: Number(item.reorderPoint),
    }))
    .sort((a, b) => a.quantity - b.quantity);

  const recentOrders = orders
    .filter((order) => order.createdAt && new Date(order.createdAt) >= todayStart)
    .slice(0, 8)
    .map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
    }));

  return (
    <DashboardWrapper
      revenueData={revenueData}
      topMenuItems={menuItemsData.top || []}
      worstMenuItems={menuItemsData.worst || []}
      lowStockItems={lowStock}
      recentOrders={recentOrders}
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
