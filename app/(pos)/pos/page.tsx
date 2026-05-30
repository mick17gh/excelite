import { Suspense } from "react";
import { getBranches } from "@/lib/actions/branches";
import { getMenuItems } from "@/lib/actions/menu";
import { getCustomers } from "@/lib/actions/customers";
import { PosContent } from "@/components/pos/pos-content";
import { listPosOrders } from "@/lib/actions/pos";
import { getPosStorefrontQrContext } from "@/lib/actions/organization";
import { canAuthorizeComplimentary } from "@/lib/actions/pos";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { Role } from "@/lib/generated/prisma/client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

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

  let allowComplimentary = false;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userRole = (session?.user?.role as Role) || "STAFF";
  if (session?.user?.id && session.user.role) {
    const dbUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });
    if (dbUser?.organizationId) {
      allowComplimentary = await canAuthorizeComplimentary(
        session.user.role,
        dbUser.organizationId,
      );
    }
  }

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
          allowComplimentary={allowComplimentary}
          userRole={userRole}
        />
      </Suspense>
    </div>
  );
}
