import { Suspense } from "react";
import { InventoryContent } from "@/components/inventory/inventory-content";
import { getInventoryItems, getSuppliers, getInboundRecords, getOutboundRecords, getTransferRecords } from "@/lib/actions/inventory";
import { getBranches } from "@/lib/actions/branches";

export const metadata = {
  title: "Inventory Management | Dinelytix",
  description: "Track and manage inventory across all restaurant branches",
};

export default async function InventoryPage() {
  const [branchesResult, inventoryResult, suppliersResult, inboundResult, outboundResult, transferResult] = await Promise.all([
    getBranches(),
    getInventoryItems(),
    getSuppliers(),
    getInboundRecords(),
    getOutboundRecords(),
    getTransferRecords(),
  ]);

  const branchList = branchesResult.data || [];
  const rawItems = inventoryResult.data || [];
  const inboundRecords = inboundResult.data || [];
  const outboundRecords = outboundResult.data || [];
  const transferRecords = transferResult.data || [];
  const items = rawItems.map((item: { id: string; name: string; sku: string; category: string; unit: string; currentStock: { toNumber?: () => number } | number; minStock: { toNumber?: () => number } | number; maxStock: { toNumber?: () => number } | number; reorderPoint: { toNumber?: () => number } | number; unitCost: { toNumber?: () => number } | number; branchId: string; branch: { name: string } }) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Inventory Management
        </h1>
        <p className="text-muted-foreground">
          Track inbound, outbound, and stock levels across all branches
        </p>
      </div>

      <Suspense fallback={<InventoryLoadingSkeleton />}>
        <InventoryContent 
          items={items} 
          branches={branchList} 
          inboundRecords={inboundRecords}
          outboundRecords={outboundRecords}
          transferRecords={transferRecords}
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
