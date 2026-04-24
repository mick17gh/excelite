import { NextRequest, NextResponse } from "next/server";
import { buildPublicStoreConfig, getOrganizationForStorefront, getStorefrontAvailability, isStorefrontEnabledForOrg, resolveAllowedStorefrontOrigins } from "@/lib/storefront/config";
import { recordStorefrontMetric } from "@/lib/storefront/metrics";
import { takeRateLimitToken } from "@/lib/storefront/rate-limit";

function withCors(req: NextRequest, response: NextResponse, allowedOrigins: string[]) {
  const origin = req.headers.get("origin");
  if (!origin) return response;
  if (allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
    response.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type,Idempotency-Key");
  }
  return response;
}

export async function OPTIONS(req: NextRequest) {
  return withCors(req, new NextResponse(null, { status: 204 }), []);
}

export async function GET(req: NextRequest, context: { params: Promise<{ organizationId: string }> }) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const limiter = takeRateLimitToken(`public:config:${ip}`);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { organizationId } = await context.params;
  const org = await getOrganizationForStorefront(organizationId);
  if (!org) {
    recordStorefrontMetric("storefront.config.requests", { organizationId, status: 404 });
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const config = buildPublicStoreConfig(org);
  const allowedOrigins = resolveAllowedStorefrontOrigins(config);
  const availability = getStorefrontAvailability(org);

  if (!isStorefrontEnabledForOrg(org)) {
    recordStorefrontMetric("storefront.config.requests", { organizationId, status: 503 });
    const closedConfig = {
      ...config,
      status: {
        ...config.status,
        enabled: false,
        isOpenNow: false,
        closedReason: org.closureMessage || "Online ordering is currently unavailable",
      },
    };
    return withCors(
      req,
      NextResponse.json(
        {
          error: "Store temporarily closed",
          data: closedConfig,
          maintenance: {
            message: org.closureMessage || "Online ordering is currently unavailable",
            contactPhone: org.contactPhone,
          },
        },
        { status: 503 }
      ),
      allowedOrigins
    );
  }
  if (!availability.isOpenNow) {
    recordStorefrontMetric("storefront.config.requests", { organizationId, status: 503, reason: "outside_business_hours" });
    const closedConfig = {
      ...config,
      status: {
        ...config.status,
        isOpenNow: false,
        closedReason: org.closureMessage || "Store is currently outside business hours",
      },
    };
    return withCors(
      req,
      NextResponse.json(
        {
          error: "Store temporarily closed",
          data: closedConfig,
          maintenance: {
            message: org.closureMessage || "Store is currently outside business hours",
            contactPhone: org.contactPhone,
            nextOpenAt: availability.nextOpenAt,
          },
        },
        { status: 503 }
      ),
      allowedOrigins
    );
  }

  recordStorefrontMetric("storefront.config.requests", { organizationId, status: 200 });
  return withCors(req, NextResponse.json({ data: config }), allowedOrigins);
}
