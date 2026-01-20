import { Suspense } from "react";
import { getBranches } from "@/lib/actions/branches";
import { getMenuItems } from "@/lib/actions/menu";
import { PosContent } from "@/components/pos/pos-content";
import { listPosOrders } from "@/lib/actions/pos";

export const metadata = {
  title: "POS | Dinelytix",
  description: "Cashier POS for order entry and payments.",
};

export default async function PosPage() {
  const [branchesResult, menuItemsResult, ordersResult] = await Promise.all([
    getBranches(),
    getMenuItems(),
    listPosOrders(),
  ]);

  // Data is already converted to plain objects with numbers in server actions
  const branches = branchesResult.data || [];
  const menuItems = menuItemsResult.data || [];
  const orders = ordersResult.data || [];

  return (
    <div className="h-full">
      {/* <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Point of Sale</h1>
        <p className="text-muted-foreground text-sm">
          Create orders and process payments
        </p>
      </div> */}

      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
        <PosContent branches={branches} menuItems={menuItems} recentOrders={orders} />
      </Suspense>
    </div>
  );
}
