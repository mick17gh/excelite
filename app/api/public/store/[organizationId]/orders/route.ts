import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createOrder } from "@/lib/actions/orders";
import { sendOrderPlacedSMS } from "@/lib/services/sms-notifications";
import { buildPublicStoreConfig, getOrganizationForStorefront, getStorefrontAvailability, isStorefrontEnabledForOrg, resolveAllowedStorefrontOrigins } from "@/lib/storefront/config";
import { getIdempotentResponse, setIdempotentResponse } from "@/lib/storefront/idempotency";
import { recordStorefrontMetric } from "@/lib/storefront/metrics";
import { takeRateLimitToken } from "@/lib/storefront/rate-limit";

const createOrderSchema = z.object({
  branchId: z.string().min(1),
  orderType: z.enum(["DELIVERY", "TAKEOUT"]),
  items: z.array(
    z.object({
      menuItemId: z.string().min(1),
      quantity: z.number().int().positive(),
      notes: z.string().max(300).optional(),
    })
  ).min(1),
  customerInfo: z.object({
    name: z.string().min(2),
    phone: z.string().min(5),
    email: z.string().email().optional(),
  }),
  deliveryDetails: z.object({
    address: z.string().min(3).optional(),
    city: z.string().optional(),
    notes: z.string().max(500).optional(),
  }).optional(),
  paymentMethod: z.enum(["CASH", "PAYSTACK"]).default("CASH"),
  notes: z.string().max(500).optional(),
});

function applyCors(req: NextRequest, response: NextResponse, allowedOrigins: string[]) {
  const origin = req.headers.get("origin");
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type,Idempotency-Key");
  }
  return response;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "").trim();
}

export async function POST(req: NextRequest, context: { params: Promise<{ organizationId: string }> }) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const limiter = takeRateLimitToken(`public:orders:${ip}`);
  if (!limiter.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { organizationId } = await context.params;
  const org = await getOrganizationForStorefront(organizationId);
  if (!org) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const cfg = buildPublicStoreConfig(org);
  const allowedOrigins = resolveAllowedStorefrontOrigins(cfg);
  const availability = getStorefrontAvailability(org);
  if (!isStorefrontEnabledForOrg(org)) {
    return applyCors(req, NextResponse.json({ error: "Store temporarily closed" }, { status: 503 }), allowedOrigins);
  }
  if (!availability.isOpenNow) {
    return applyCors(
      req,
      NextResponse.json({
        error: "Store temporarily closed",
        nextOpenAt: availability.nextOpenAt,
      }, { status: 503 }),
      allowedOrigins
    );
  }

  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return applyCors(req, NextResponse.json({ error: "Invalid order payload", details: parsed.error.flatten() }, { status: 400 }), allowedOrigins);
    }

    const data = parsed.data;
    if (data.orderType === "DELIVERY" && !org.deliveryEnabled) {
      return applyCors(req, NextResponse.json({ error: "Delivery is disabled for this store" }, { status: 400 }), allowedOrigins);
    }
    if (data.orderType === "TAKEOUT" && !org.pickupEnabled) {
      return applyCors(req, NextResponse.json({ error: "Pickup is disabled for this store" }, { status: 400 }), allowedOrigins);
    }

    const idempotencyKey = req.headers.get("idempotency-key");
    const cacheKey = idempotencyKey ? `${organizationId}:${idempotencyKey}` : null;
    if (cacheKey) {
      const cached = getIdempotentResponse(cacheKey);
      if (cached) {
        return applyCors(req, NextResponse.json({ data: cached }), allowedOrigins);
      }
    }

    const normalizedPhone = normalizePhone(data.customerInfo.phone);
    let customerId: string | undefined;
    try {
      let customer = await db.customer.findUnique({
        where: { phone: normalizedPhone },
        select: { id: true, name: true, email: true, address: true, city: true, isActive: true },
      });

      if (!customer) {
        customer = await db.customer.create({
          data: {
            name: data.customerInfo.name,
            phone: normalizedPhone,
            email: data.customerInfo.email || null,
            address: data.deliveryDetails?.address || null,
            city: data.deliveryDetails?.city || null,
            isActive: true,
          },
          select: { id: true, name: true, email: true, address: true, city: true, isActive: true },
        });
      } else {
        const nextName = customer.name || data.customerInfo.name;
        const nextEmail = customer.email || data.customerInfo.email || null;
        const nextAddress = customer.address || data.deliveryDetails?.address || null;
        const nextCity = customer.city || data.deliveryDetails?.city || null;
        if (
          nextName !== customer.name ||
          nextEmail !== customer.email ||
          nextAddress !== customer.address ||
          nextCity !== customer.city ||
          !customer.isActive
        ) {
          customer = await db.customer.update({
            where: { id: customer.id },
            data: {
              name: nextName,
              email: nextEmail,
              address: nextAddress,
              city: nextCity,
              isActive: true,
            },
            select: { id: true, name: true, email: true, address: true, city: true, isActive: true },
          });
        }
      }

      customerId = customer.id;
    } catch (customerError) {
      console.warn("[public orders] Customer upsert failed; proceeding without linked customer:", customerError);
    }

    const orderResult = await createOrder({
      customerId,
      branchId: data.branchId,
      customerName: data.customerInfo.name,
      source: "ONLINE",
      type: data.orderType === "DELIVERY" ? "DELIVERY" : "TAKEOUT",
      items: data.items,
      notes: data.notes,
      paymentMethod: data.paymentMethod,
      deliveryAddress: data.deliveryDetails?.address,
      deliveryCity: data.deliveryDetails?.city,
      deliveryPhone: normalizedPhone,
      deliveryNotes: data.deliveryDetails?.notes,
      deliveryFee: data.orderType === "DELIVERY" && org.deliveryFeeFlat ? Number(org.deliveryFeeFlat) : 0,
    });

    if (orderResult.error || !orderResult.data) {
      recordStorefrontMetric("storefront.orders.failed", { organizationId, reason: orderResult.error || "unknown" });
      return applyCors(req, NextResponse.json({ error: orderResult.error || "Failed to create order" }, { status: 400 }), allowedOrigins);
    }

    const responseData = {
      orderId: orderResult.data.id,
      orderNumber: orderResult.data.orderNumber,
      total: Number(orderResult.data.total),
      paymentStatus: orderResult.data.paymentStatus,
      paymentIntent: data.paymentMethod === "PAYSTACK"
        ? {
            provider: "paystack",
            reference: orderResult.data.orderNumber,
          }
        : null,
    };

    if (cacheKey) setIdempotentResponse(cacheKey, responseData);
    recordStorefrontMetric("storefront.orders.created", {
      organizationId,
      branchId: data.branchId,
      paymentMethod: data.paymentMethod,
      total: responseData.total,
    });

    // Non-blocking SMS notification for successful order placement.
    void sendOrderPlacedSMS(orderResult.data.id);

    return applyCors(req, NextResponse.json({ data: responseData }, { status: 201 }), allowedOrigins);
  } catch (error) {
    console.error("[public orders] Failed to create order:", error);
    return applyCors(req, NextResponse.json({ error: "Failed to create order" }, { status: 500 }), allowedOrigins);
  }
}
