import { Suspense } from "react";
import { InventoryContent } from "@/components/inventory/inventory-content";
import { getInventoryItems, getSuppliers, getOutboundRecords, getTransferRecords } from "@/lib/actions/inventory";
import { getWarehouseTransfers } from "@/lib/actions/warehouse";
import { getBranches } from "@/lib/actions/branches";
import { getWarehouses } from "@/lib/actions/warehouse";
import { getBranchWarehouseTransfers } from "@/lib/actions/stock-transfers";
import { listInventoryCategories } from "@/lib/actions/inventory-categories";

export const metadata = {
  title: "Inventory Management | ServStack",
  description: "Track and manage inventory across all restaurant branches",
};

export default async function InventoryPage() {
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

  const [
    branchesResult,
    inventoryResult,
    suppliersResult,
    outboundResult,
    transferResult,
    warehouseTransfersResult,
    warehousesResult,
    branchReturnsResult,
    categoriesResult,
  ] = await Promise.all([
    getBranches(),
    getInventoryItems(undefined, { page: 1, pageSize: 1000 }),
    getSuppliers(),
    getOutboundRecords(),
    getTransferRecords(),
    getWarehouseTransfers(),
    getWarehouses(),
    getBranchWarehouseTransfers({ limit: 200 }),
    listInventoryCategories({ activeOnly: true }),
  ]);
  const warehouseList = (warehousesResult.data || []).map((w) => ({
    id: w.id,
    name: w.name,
    code: w.code,
  }));

  const branchList = (branchesResult.data || []).map((branch: any) => {
    const { taxRate, ...rest } = branch;
    return {
      ...rest,
      taxRate: taxRate ? Number(taxRate) : 0,
    };
  });
  const rawItems = (inventoryResult.data || []) as RawInventoryItem[];
  const outboundRecords = (outboundResult.data || []) as OutboundRecord[];
  const transferRecords = (transferResult.data || []) as TransferRecord[];
  const warehouseTransfers = (warehouseTransfersResult.data || []) as WarehouseTransfer[];
  const branchReturns = branchReturnsResult.data || [];
  const items = rawItems.map((item) => {
    const currentStock = typeof item.currentStock === 'object' && item.currentStock.toNumber ? item.currentStock.toNumber() : Number(item.currentStock);
    const minStock = typeof item.minStock === 'object' && item.minStock.toNumber ? item.minStock.toNumber() : Number(item.minStock);
    const maxStock = typeof item.maxStock === 'object' && item.maxStock.toNumber ? item.maxStock.toNumber() : Number(item.maxStock);
    const reorderPoint = typeof item.reorderPoint === 'object' && item.reorderPoint.toNumber ? item.reorderPoint.toNumber() : Number(item.reorderPoint);
    
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
      unitCost: typeof item.unitCost === 'object' && item.unitCost.toNumber ? item.unitCost.toNumber() : Number(item.unitCost),
      branchId: item.branchId,
      branchName: item.branch?.name || "Unknown",
      status,
    };
  });
  const suppliers = suppliersResult.data || [];
  const categories = categoriesResult.success ? categoriesResult.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Inventory Management
        </h1>
        <p className="text-muted-foreground">
          Track stock levels, transfers, and movements across all branches
        </p>
      </div>

      <Suspense fallback={<InventoryLoadingSkeleton />}>
        <InventoryContent 
          items={items} 
          branches={branchList}
          categories={categories}
          warehouses={warehouseList}
          outboundRecords={outboundRecords}
          transferRecords={transferRecords}
          warehouseTransfers={warehouseTransfers}
          branchReturns={branchReturns}
        />
      </Suspense>
    </div>
  );
}

function InventoryLoadingSkeleton() {
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
