import { Suspense } from "react";
import { getBranches } from "@/lib/actions/branches";
import { getMenuItems } from "@/lib/actions/menu";
import { getPosCustomerCache } from "@/lib/actions/customers";
import { PosContent } from "@/components/pos/pos-content";
import { PosPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { listPosOrders, canAuthorizeComplimentary } from "@/lib/actions/pos";
import { getPosOrgContext } from "@/lib/actions/organization";
import { enforcePageRouteAccess } from "@/lib/permissions/enforce-page";
import { requireSessionAccess } from "@/lib/permissions/load-session-access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "POS",
  description: "Cashier POS for order entry and payments.",
};

export default function PosPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PosPageSkeleton />}>
        <PosPageData />
      </Suspense>
    </div>
  );
}

async function PosPageData() {
  await enforcePageRouteAccess("/pos");
  const access = await requireSessionAccess();

  const [
    branchesResult,
    menuItemsResult,
    ordersResult,
    customersResult,
    qrContextResult,
    allowComplimentary,
  ] = await Promise.all([
    getBranches(),
    getMenuItems(),
    listPosOrders(),
    getPosCustomerCache(),
    getPosOrgContext(),
    canAuthorizeComplimentary(access.role, access.organizationId),
  ]);

  const branches = (branchesResult.data || []).map((branch) => {
    const { taxRate, ...rest } = branch;
    return { ...rest, taxRate: taxRate ? Number(taxRate) : 0 };
  });
  const menuItems = (menuItemsResult.data || []).map((item) => ({
    ...item,
    sku: item.sku,
  }));
  const orders = ordersResult.data || [];
  const customers = customersResult.data || [];
  const orgContext = qrContextResult.data;
  const storefrontQr =
    orgContext?.showQr && orgContext.storefrontUrl
      ? { url: orgContext.storefrontUrl }
      : null;

  return (
    <PosContent
      branches={branches}
      menuItems={menuItems}
      recentOrders={orders}
      customers={customers}
      storefrontQr={storefrontQr}
      allowComplimentary={allowComplimentary}
      userRole={access.role}
      posBarcodeEnabled={orgContext?.posBarcodeEnabled ?? false}
      businessMode={orgContext?.businessMode ?? "RESTAURANT"}
    />
  );
}
