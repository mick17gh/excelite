import { Suspense } from "react";
import { WarehouseContent } from "@/components/warehouse/warehouse-content";
import { getWarehouses, getWarehouseInventory, getWarehouseTransfers, getWarehouseStats } from "@/lib/actions/warehouse";
import { getBranches } from "@/lib/actions/branches";

export const metadata = {
  title: "Warehouse | ServStack",
  description: "Manage warehouse inventory and branch transfers",
};

export default async function WarehousePage() {
  const [warehousesResult, transfersResult, statsResult, branchesResult] = await Promise.all([
    getWarehouses(),
    getWarehouseTransfers(),
    getWarehouseStats(),
    getBranches(),
  ]);

  const warehouses = warehousesResult.data || [];
  const transfers = transfersResult.data || [];
  const stats = statsResult.data;
  const branches = (branchesResult.data || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    code: b.code,
  }));

  // Fetch inventory for all warehouses
  const allItems = [];
  for (const wh of warehouses) {
    const inv = await getWarehouseInventory(wh.id);
    allItems.push(...(inv.data || []));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Warehouse</h1>
        <p className="text-muted-foreground">
          Manage warehouse inventory and transfers to branches
        </p>
      </div>

      <Suspense fallback={<WarehouseLoadingSkeleton />}>
        <WarehouseContent
          warehouses={warehouses}
          items={allItems}
          transfers={transfers}
          branches={branches}
          stats={stats}
        />
      </Suspense>
    </div>
  );
}

function WarehouseLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
