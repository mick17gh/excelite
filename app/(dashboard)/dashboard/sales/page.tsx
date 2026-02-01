import { Suspense } from "react";
import { SalesContent } from "@/components/sales/sales-content";
import { getBranches } from "@/lib/actions/branches";
import {
  getRevenueData,
  getSalesByChannel,
  getSalesByDaypart,
  getTopMenuItems,
  getHourlySalesData,
} from "@/lib/actions/transactions";

export const metadata = {
  title: "Sales Analytics | Dinelytix",
  description: "Detailed sales and revenue analytics across all branches",
};

export default async function SalesPage() {
  const [
    branchesResult,
    revenueResult,
    channelResult,
    daypartResult,
    topItemsResult,
    hourlyResult,
  ] = await Promise.all([
    getBranches(),
    getRevenueData(),
    getSalesByChannel(),
    getSalesByDaypart(),
    getTopMenuItems(),
    getHourlySalesData(),
  ]);

  const branches = (branchesResult.data || []).map((branch: any) => {
    const { taxRate, ...rest } = branch;
    return {
      ...rest,
      taxRate: taxRate ? Number(taxRate) : 0,
    };
  });
  const revenueData = revenueResult.data || [];
  const salesByChannel = channelResult.data || [];
  const salesByDaypart = daypartResult.data || [];
  const menuItemsData = topItemsResult.data || { top: [], worst: [] };
  const topMenuItems = menuItemsData.top || [];
  const worstMenuItems = menuItemsData.worst || [];
  const hourlyData = hourlyResult.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Sales & Revenue Analytics
        </h1>
        <p className="text-muted-foreground">
          Comprehensive sales data and revenue insights
        </p>
      </div>

      <Suspense fallback={<SalesLoadingSkeleton />}>
        <SalesContent
          revenueData={revenueData}
          salesByChannel={salesByChannel}
          salesByDaypart={salesByDaypart}
          topItems={topMenuItems}
          worstItems={worstMenuItems}
          branches={branches}
          hourlyData={hourlyData}
        />
      </Suspense>
    </div>
  );
}

function SalesLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
