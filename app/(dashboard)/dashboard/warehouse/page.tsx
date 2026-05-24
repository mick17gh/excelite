import { Suspense } from "react";
import { WarehouseContent } from "@/components/warehouse/warehouse-content";
import { getWarehouses, getWarehouseInventory, getWarehouseTransfers, getWarehouseStats, getWarehouseInboundRecords, getWarehouseWasteLogs } from "@/lib/actions/warehouse";
import { getWarehouseTransfers as getWarehouseMaterialTransfers } from "@/lib/actions/stock-transfers";
import { getBranches } from "@/lib/actions/branches";

export const metadata = {
  title: "Warehouse | ServStack",
  description: "Manage warehouse inventory and branch transfers",
};

export default async function WarehousePage() {
  const [warehousesResult, transfersResult, materialTransfersResult, statsResult, branchesResult, inboundResult, wastageResult] = await Promise.all([
    getWarehouses(),
    getWarehouseTransfers(),
    getWarehouseMaterialTransfers(),
    getWarehouseStats(),
    getBranches(),
    getWarehouseInboundRecords(),
    getWarehouseWasteLogs(),
  ]);

  const warehouses = warehousesResult.data || [];
  const transfers = transfersResult.data || [];
  const materialTransfers = (materialTransfersResult.data || []).map((t) => ({
    id: t.id,
    fromWarehouseId: t.fromWarehouseId,
    toWarehouseId: t.toWarehouseId,
    fromWarehouseName: t.fromWarehouseName,
    toWarehouseName: t.toWarehouseName,
    itemName: t.itemName,
    itemSku: t.itemSku,
    itemUnit: t.itemUnit,
    quantity: t.quantity,
    totalCost: t.totalCost,
    status: t.status,
    transferDate: t.transferDate,
  }));
  const stats = statsResult.data;
  const inboundRecords = inboundResult.data || [];
  const wastageRecords = wastageResult.data || [];
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
          materialTransfers={materialTransfers}
          branches={branches}
          stats={stats}
          inboundRecords={inboundRecords}
          wastageRecords={wastageRecords}
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
