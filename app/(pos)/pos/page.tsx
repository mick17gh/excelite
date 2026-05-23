import { Suspense } from "react";
import { getBranches } from "@/lib/actions/branches";
import { getMenuItems } from "@/lib/actions/menu";
import { getCustomers } from "@/lib/actions/customers";
import { PosContent } from "@/components/pos/pos-content";
import { listPosOrders } from "@/lib/actions/pos";
import { getPosStorefrontQrContext } from "@/lib/actions/organization";

export const metadata = {
  title: "POS | ServStack",
  description: "Cashier POS for order entry and payments.",
};

export default async function PosPage() {
  const [branchesResult, menuItemsResult, ordersResult, customersResult, qrContextResult] =
    await Promise.all([
      getBranches(),
      getMenuItems(),
      listPosOrders(),
      getCustomers(),
      getPosStorefrontQrContext(),
    ]);

  // Serialize Decimal fields for client components
  const branches = (branchesResult.data || []).map((branch) => {
    const { taxRate, ...rest } = branch;
    return { ...rest, taxRate: taxRate ? Number(taxRate) : 0 };
  });
  const menuItems = menuItemsResult.data || [];
  const orders = ordersResult.data || [];
  const customers = customersResult.data || [];
  const storefrontQr =
    qrContextResult.data?.showQr && qrContextResult.data.storefrontUrl
      ? { url: qrContextResult.data.storefrontUrl }
      : null;

  return (
    <div className="h-full">
      {/* <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Point of Sale</h1>
        <p className="text-muted-foreground text-sm">
          Create orders and process payments
        </p>
      </div> */}

      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
        <PosContent
          branches={branches}
          menuItems={menuItems}
          recentOrders={orders}
          customers={customers}
          storefrontQr={storefrontQr}
        />
      </Suspense>
    </div>
  );
}
