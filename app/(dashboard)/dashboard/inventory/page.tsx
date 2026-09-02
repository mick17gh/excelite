import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { InventoryContent } from "@/components/inventory/inventory-content";
import { getInventoryItems } from "@/lib/actions/inventory";
import { getBranches } from "@/lib/actions/branches";
import { getWarehouses } from "@/lib/actions/warehouse";
import { listInventoryCategories } from "@/lib/actions/inventory-categories";

export const metadata = {
  title: "Inventory Management",
  description: "Track and manage inventory across all restaurant branches",
};

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        description="Track stock levels, transfers, and movements across all branches"
      />
      <Suspense fallback={<DashboardPageSkeleton kpiCount={4} />}>
        <InventoryPageData />
      </Suspense>
    </div>
  );
}

async function InventoryPageData() {
  type RawInventoryItem = {
    id: string;
    name: string;
    sku: string;
    category: string;
    unit: string;
    currentStock: { toNumber?: () => number } | number;
    minStock: { toNumber?: () => number } | number;
    maxStock: { toNumber?: () => number } | number;
    reorderPoint: { toNumber?: () => number } | number;
    unitCost: { toNumber?: () => number } | number;
    branchId: string;
    branch?: { name?: string };
  };
  type OutboundRecord = {
    id: string;
    branchId?: string;
    quantity: number;
    movementType: string;
    reason: string | null;
    createdAt: Date;
    item: { name: string; sku: string };
    branch: { name: string };
  };
  type TransferRecord = {
    id: string;
    fromBranchId?: string;
    toBranchId?: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    transferDate: Date;
    status: string;
    notes: string | null;
    approvedBy: string | null;
    receivedBy: string | null;
    createdAt: Date;
    item: { name: string; sku: string };
    fromBranch: { name: string };
    toBranch: { name: string };
  };
  type WarehouseTransfer = {
    id: string;
    warehouseId: string;
    warehouseName: string;
    warehouseItemId: string;
    itemName: string;
    itemSku: string;
    itemUnit: string;
    toBranchId: string;
    toBranchName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    status: string;
    transferDate: string;
    approvedBy: string | null;
    receivedBy: string | null;
    notes: string | null;
    createdAt: string;
  };

  const [branchesResult, inventoryResult, warehousesResult, categoriesResult] =
    await Promise.all([
      getBranches(),
      getInventoryItems(undefined, { page: 1, pageSize: 25 }),
      getWarehouses(),
      listInventoryCategories({ activeOnly: true }),
    ]);
  const warehouseList = (warehousesResult.data || []).map((w) => ({
    id: w.id,
    name: w.name,
    code: w.code,
  }));

  const branchList = (branchesResult.data || []).map((branch: {
    taxRate?: unknown;
    id: string;
    name: string;
    code: string;
    [key: string]: unknown;
  }) => {
    const { taxRate, ...rest } = branch;
    return {
      ...rest,
      taxRate: taxRate ? Number(taxRate) : 0,
    };
  });
  const rawItems = (inventoryResult.data || []) as RawInventoryItem[];
  const items = rawItems.map((item) => {
    const currentStock =
      typeof item.currentStock === "object" && item.currentStock.toNumber
        ? item.currentStock.toNumber()
        : Number(item.currentStock);
    const minStock =
      typeof item.minStock === "object" && item.minStock.toNumber
        ? item.minStock.toNumber()
        : Number(item.minStock);
    const maxStock =
      typeof item.maxStock === "object" && item.maxStock.toNumber
        ? item.maxStock.toNumber()
        : Number(item.maxStock);
    const reorderPoint =
      typeof item.reorderPoint === "object" && item.reorderPoint.toNumber
        ? item.reorderPoint.toNumber()
        : Number(item.reorderPoint);

    let status: "critical" | "low" | "normal" | "overstock" = "normal";
    if (currentStock <= minStock) status = "critical";
    else if (currentStock <= reorderPoint) status = "low";
    else if (currentStock > maxStock) status = "overstock";

    return {
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      currentStock,
      minStock,
      maxStock,
      unitCost:
        typeof item.unitCost === "object" && item.unitCost.toNumber
          ? item.unitCost.toNumber()
          : Number(item.unitCost),
      branchId: item.branchId,
      branchName: item.branch?.name || "Unknown",
      status,
    };
  });
  const categories = categoriesResult.success ? categoriesResult.data : [];

  return (
    <InventoryContent
      items={items}
      branches={branchList}
      categories={categories}
      warehouses={warehouseList}
      initialItemsTotal={inventoryResult.pagination?.totalItems || items.length}
    />
  );
}
