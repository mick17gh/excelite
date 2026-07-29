import Link from "next/link";
import { Suspense } from "react";
import { Monitor } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import { OrdersContent } from "@/components/orders/orders-content";
import { getOrders, getOrderStats } from "@/lib/actions/orders";
import { getBranches } from "@/lib/actions/branches";
import { getMenuItems } from "@/lib/actions/menu";
import { getCustomers } from "@/lib/actions/customers";
import { isTableManagementEnabled } from "@/lib/features/table-management";
import { enforcePageRouteAccess } from "@/lib/permissions/enforce-page";
import { requireSessionAccess } from "@/lib/permissions/load-session-access";

export const metadata = {
  title: "Orders",
  description: "Manage and track all orders across branches",
};

export default function OrdersPage() {
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
      <Suspense fallback={<DashboardPageSkeleton kpiCount={4} />}>
        <OrdersPageData />
      </Suspense>
    </div>
  );
}

async function OrdersPageData() {
  await enforcePageRouteAccess("/dashboard/orders");
  const access = await requireSessionAccess();

  const [ordersResult, statsResult, branchesResult, menuResult, customersResult, tableManagementEnabled] =
    await Promise.all([
      getOrders({ pageSize: 50, page: 1 }),
      getOrderStats(),
      getBranches(),
      getMenuItems(),
      getCustomers(),
      isTableManagementEnabled(access.organizationId),
    ]);

  const orders = ordersResult.data || [];
  const total = ordersResult.total || 0;
  const page = ordersResult.page || 1;
  const pageSize = ordersResult.pageSize || 50;
  const stats = statsResult.data;
  const branches = (branchesResult.data || []).map((b: {
    id: string;
    name: string;
    code: string;
    taxRate?: unknown;
    taxEnabled?: boolean;
    taxName?: string;
    taxInclusive?: boolean;
    showTaxOnReceipt?: boolean;
    taxNumber?: string | null;
    showTaxNumberOnReceipt?: boolean;
  }) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    taxRate: typeof b.taxRate === "object" ? Number(b.taxRate) : Number(b.taxRate || 0),
    taxEnabled: b.taxEnabled ?? true,
    taxName: b.taxName || "VAT",
    taxInclusive: b.taxInclusive ?? false,
    showTaxOnReceipt: b.showTaxOnReceipt ?? true,
    taxNumber: b.taxNumber ?? null,
    showTaxNumberOnReceipt: b.showTaxNumberOnReceipt ?? false,
  }));
  const menuItems = (menuResult.data || []).map((m: {
    id: string;
    name: string;
    sku: string;
    price: { toNumber?: () => number } | number;
    categoryId: string;
    optionGroups?: unknown[];
  }) => ({
    id: m.id,
    name: m.name,
    sku: m.sku,
    price:
      typeof m.price === "object" && m.price?.toNumber
        ? m.price.toNumber()
        : Number(m.price),
    categoryId: m.categoryId,
    optionGroups: m.optionGroups ?? [],
  }));
  const customers = customersResult.data || [];

  return (
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
  );
}
