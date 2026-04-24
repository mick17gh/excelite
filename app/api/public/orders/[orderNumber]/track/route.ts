import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { takeRateLimitToken } from "@/lib/storefront/rate-limit";

export async function GET(req: NextRequest, context: { params: Promise<{ orderNumber: string }> }) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const limiter = takeRateLimitToken(`public:track:${ip}`);
  if (!limiter.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { orderNumber } = await context.params;
  const phone = new URL(req.url).searchParams.get("phone");
  if (!phone) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: {
      branch: { select: { id: true, name: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const expectedPhone = order.deliveryPhone?.replace(/\s+/g, "");
  const providedPhone = phone.replace(/\s+/g, "");
  if (!expectedPhone || expectedPhone !== providedPhone) {
    return NextResponse.json({ error: "Phone verification failed" }, { status: 403 });
  }

  return NextResponse.json({
    data: {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      estimatedTimeMinutes: null,
      orderType: order.type,
      branch: order.branch,
      timeline: [
        { code: "NEW", reached: true },
        { code: "CONFIRMED", reached: ["IN_PROGRESS", "READY", "COMPLETED"].includes(order.status) },
        { code: "PREPARING", reached: ["IN_PROGRESS", "READY", "COMPLETED"].includes(order.status) },
        { code: "READY", reached: ["READY", "COMPLETED"].includes(order.status) },
        { code: "OUT_FOR_DELIVERY", reached: order.status === "COMPLETED" && order.type === "DELIVERY" },
        { code: "DELIVERED", reached: order.status === "COMPLETED" },
      ],
    },
  });
}
