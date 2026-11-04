import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StorefrontOrderPage } from "@/components/storefront/storefront-order-page";
import { getStorefrontOrgId, isStorefrontSurface } from "@/lib/storefront/surface";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  if (!isStorefrontSurface()) notFound();
  const { orderNumber } = await params;
  const organizationId = getStorefrontOrgId()!;

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>}>
      <StorefrontOrderPage organizationId={organizationId} orderNumber={orderNumber} />
    </Suspense>
  );
}
