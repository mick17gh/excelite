import { MarketingLandingPage } from "@/components/marketing/landing-page";
import { StorefrontHome } from "@/components/storefront/storefront-home";
import { getStorefrontOrgId, isHideLandingPage, isStorefrontSurface } from "@/lib/storefront/surface";

export default function HomePage() {
  if (isHideLandingPage()) {
    // Middleware redirects; keep a safe fallback.
    return null;
  }

  if (isStorefrontSurface()) {
    const organizationId = getStorefrontOrgId();
    if (!organizationId) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4 text-center text-sm text-slate-600">
          Storefront is enabled but NEXT_PUBLIC_STOREFRONT_ORG_ID is not set.
        </div>
      );
    }
    return <StorefrontHome organizationId={organizationId} />;
  }

  return <MarketingLandingPage />;
}
