import { Suspense } from "react";
import { headers } from "next/headers";
import { WarehouseContent } from "@/components/warehouse/warehouse-content";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import {
  getWarehouses,
  getWarehouseInventory,
  getWarehouseTransfers,
  getWarehouseStats,
  getWarehouseInboundRecords,
  getWarehouseWasteLogs,
  getWarehouseOutboundLogs,
} from "@/lib/actions/warehouse";
import {
  getBranchWarehouseTransfers,
  getWarehouseTransfers as getWarehouseMaterialTransfers,
} from "@/lib/actions/stock-transfers";
import { getBranches } from "@/lib/actions/branches";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@/lib/generated/prisma/client";
import { listInventoryCategories } from "@/lib/actions/inventory-categories";

export const metadata = {
  title: "Warehouse",
  description: "Manage warehouse inventory and branch transfers",
};

const EMPTY_STATS = {
  totalWarehouses: 0,
  totalItems: 0,
  pendingTransfers: 0,
};

export default function WarehousePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Warehouse</h1>
        <p className="text-muted-foreground">
          Manage warehouse inventory and transfers to branches
        </p>
      </div>
      <Suspense fallback={<DashboardPageSkeleton kpiCount={3} />}>
        <WarehousePageData />
      </Suspense>
    </div>
  );
}

async function WarehousePageData() {
  const session = await auth.api.getSession({ headers: await headers() });
  const dbUser = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, assignedWarehouseId: true },
      })
    : null;
  const userRole = (dbUser?.role as Role) ?? "STAFF";
  const assignedWarehouseId = dbUser?.assignedWarehouseId ?? null;

  const [
    warehousesResult,
    transfersResult,
    materialTransfersResult,
    statsResult,
    branchesResult,
    inboundResult,
    wastageResult,
    outboundResult,
    branchReturnsResult,
    categoriesResult,
  ] = await Promise.all([
    getWarehouses(),
    getWarehouseTransfers(),
    getWarehouseMaterialTransfers(),
    getWarehouseStats(),
    getBranches(),
    getWarehouseInboundRecords(),
    getWarehouseWasteLogs(),
    getWarehouseOutboundLogs(),
    getBranchWarehouseTransfers({ limit: 200 }),
    listInventoryCategories({ activeOnly: true }),
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
  const stats = statsResult.data ?? EMPTY_STATS;
  const inboundRecords = inboundResult.data || [];
  const wastageRecords = wastageResult.data || [];
  const outboundRecords = outboundResult.data || [];
  const branchReturns = branchReturnsResult.data || [];
  const categories = categoriesResult.success ? categoriesResult.data : [];
  const branches = (branchesResult.data || []).map(
    (b: { id: string; name: string; code: string }) => ({
      id: b.id,
      name: b.name,
      code: b.code,
    }),
  );

  const inventoryResults = await Promise.all(
    warehouses.map((wh) => getWarehouseInventory(wh.id)),
  );
  const allItems = inventoryResults.flatMap((inv) => inv.data || []);

  return (
    <WarehouseContent
      warehouses={warehouses}
      items={allItems}
      transfers={transfers}
      materialTransfers={materialTransfers}
      branchReturns={branchReturns}
      branches={branches}
      stats={stats}
      inboundRecords={inboundRecords}
      wastageRecords={wastageRecords}
      outboundRecords={outboundRecords}
      userRole={userRole}
      assignedWarehouseId={assignedWarehouseId}
      categories={categories}
    />
  );
}
