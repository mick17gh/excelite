import { Suspense } from "react";
import { OrdersContent } from "@/components/orders/orders-content";
import { getOrders, getOrderStats } from "@/lib/actions/orders";
import { getBranches } from "@/lib/actions/branches";
import { getMenuItems } from "@/lib/actions/menu";
import { getCustomers } from "@/lib/actions/customers";

export const metadata = {
  title: "Orders | ServStack",
  description: "Manage and track all orders across branches",
};

export default async function OrdersPage() {
  const [ordersResult, statsResult, branchesResult, menuResult, customersResult] = await Promise.all([
    getOrders({ pageSize: 50, page: 1 }),
    getOrderStats(),
    getBranches(),
    getMenuItems(),
    getCustomers(),
  ]);

  const orders = ordersResult.data || [];
  const total = ordersResult.total || 0;
  const page = ordersResult.page || 1;
  const pageSize = ordersResult.pageSize || 50;
  const stats = statsResult.data;
  const branches = (branchesResult.data || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    taxRate: typeof b.taxRate === "object" ? Number(b.taxRate) : Number(b.taxRate || 0),
    taxEnabled: b.taxEnabled ?? true,
    taxName: b.taxName || "VAT",
  }));
  const menuItems = (menuResult.data || []).map((m: any) => ({
    id: m.id,
    name: m.name,
    sku: m.sku,
    price: typeof m.price === "object" && m.price?.toNumber ? m.price.toNumber() : Number(m.price),
    categoryId: m.categoryId,
    optionGroups: m.optionGroups ?? [],
  }));
  const customers = customersResult.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Orders</h1>
        <p className="text-muted-foreground">
          Manage and track all orders from every channel
        </p>
      </div>

      <Suspense fallback={<OrdersLoadingSkeleton />}>
        <OrdersContent
          orders={orders}
          branches={branches}
          menuItems={menuItems}
          customers={customers}
          stats={stats}
          initialTotal={total}
          initialPage={page}
          initialPageSize={pageSize}
        />
      </Suspense>
    </div>
  );
}

function OrdersLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
