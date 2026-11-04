import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StorefrontTrackPage } from "@/components/storefront/storefront-track-page";
import { getStorefrontOrgId, isStorefrontSurface } from "@/lib/storefront/surface";

export default function TrackPage() {
  if (!isStorefrontSurface()) notFound();
  const organizationId = getStorefrontOrgId()!;

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>}>
      <StorefrontTrackPage organizationId={organizationId} />
    </Suspense>
  );
}
