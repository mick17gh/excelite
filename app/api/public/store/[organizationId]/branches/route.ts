import { NextRequest, NextResponse } from "next/server";
import { buildPublicStoreConfig, getOrganizationForStorefront, getStorefrontAvailability, isStorefrontEnabledForOrg, resolveAllowedStorefrontOrigins } from "@/lib/storefront/config";
import { recordStorefrontMetric } from "@/lib/storefront/metrics";
import { takeRateLimitToken } from "@/lib/storefront/rate-limit";

function applyCors(req: NextRequest, response: NextResponse, allowedOrigins: string[]) {
  const origin = req.headers.get("origin");
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  return response;
}

export async function GET(req: NextRequest, context: { params: Promise<{ organizationId: string }> }) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const limiter = takeRateLimitToken(`public:branches:${ip}`);
  if (!limiter.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { organizationId } = await context.params;
  const org = await getOrganizationForStorefront(organizationId);
  if (!org) {
    recordStorefrontMetric("storefront.branches.requests", { organizationId, status: 404 });
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const cfg = buildPublicStoreConfig(org);
  const allowedOrigins = resolveAllowedStorefrontOrigins(cfg);
  const availability = getStorefrontAvailability(org);
  if (!isStorefrontEnabledForOrg(org)) {
    recordStorefrontMetric("storefront.branches.requests", { organizationId, status: 503 });
    return applyCors(req, NextResponse.json({ error: "Store temporarily closed" }, { status: 503 }), allowedOrigins);
  }
  if (!availability.isOpenNow) {
    recordStorefrontMetric("storefront.branches.requests", { organizationId, status: 503, reason: "outside_business_hours" });
    return applyCors(req, NextResponse.json({ error: "Store temporarily closed", nextOpenAt: availability.nextOpenAt }, { status: 503 }), allowedOrigins);
  }

  recordStorefrontMetric("storefront.branches.requests", { organizationId, status: 200, count: org.branches.length });
  return applyCors(
    req,
    NextResponse.json({
      data: cfg.branches,
    }),
    allowedOrigins
  );
}
