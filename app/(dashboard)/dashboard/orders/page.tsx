import Link from "next/link";
import { Suspense } from "react";
import { Monitor } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { OrdersContent } from "@/components/orders/orders-content";
import { getOrders, getOrderStats } from "@/lib/actions/orders";
import { getBranches } from "@/lib/actions/branches";
import { getMenuItems } from "@/lib/actions/menu";
import { getCustomers } from "@/lib/actions/customers";
import { isTableManagementEnabled } from "@/lib/features/table-management";
import { db } from "@/lib/db";
import { enforcePageRouteAccess } from "@/lib/permissions/enforce-page";

export const metadata = {
  title: "Orders",
  description: "Manage and track all orders across branches",
};

export default async function OrdersPage() {
  await enforcePageRouteAccess("/dashboard/orders");

  const [ordersResult, statsResult, branchesResult, menuResult, customersResult, org] =
    await Promise.all([
      getOrders({ pageSize: 50, page: 1 }),
      getOrderStats(),
      getBranches(),
      getMenuItems(),
      getCustomers(),
      db.organization.findFirst({ select: { id: true } }),
    ]);
  const tableManagementEnabled = org?.id
    ? await isTableManagementEnabled(org.id)
    : false;

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
    taxInclusive: b.taxInclusive ?? false,
    showTaxOnReceipt: b.showTaxOnReceipt ?? true,
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
      <PageHeader
        title="Orders"
        description="Manage and track all orders from every channel"
        actions={
          <Button asChild className="bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-sm">
            <Link href="/pos">
              <Monitor className="mr-2 h-4 w-4" />
              Open POS
            </Link>
          </Button>
        }
      />

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
          tableManagementEnabled={tableManagementEnabled}
        />
      </Suspense>
    </div>
  );
}

function OrdersLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted border" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-muted border" />
    </div>
  );
}
