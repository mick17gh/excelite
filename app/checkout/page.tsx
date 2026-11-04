import { notFound } from "next/navigation";
import { StorefrontCheckout } from "@/components/storefront/storefront-checkout";
import { getStorefrontOrgId, isStorefrontSurface } from "@/lib/storefront/surface";

export default function CheckoutPage() {
  if (!isStorefrontSurface()) notFound();
  const organizationId = getStorefrontOrgId();
  if (!organizationId) notFound();
  return <StorefrontCheckout organizationId={organizationId} />;
}
