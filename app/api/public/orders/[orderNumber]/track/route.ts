import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { takeRateLimitToken } from "@/lib/storefront/rate-limit";

function normalizeTrackPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("233") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `233${digits.slice(1)}`;
  if (digits.length === 9) return `233${digits}`;
  return digits;
}

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

  const expectedPhoneRaw = order.deliveryPhone || "";
  const providedPhoneRaw = phone;
  const expectedPhone = normalizeTrackPhone(expectedPhoneRaw);
  const providedPhone = normalizeTrackPhone(providedPhoneRaw);

  const matched = Boolean(expectedPhone && expectedPhone === providedPhone);
  console.log("[public track] phone lookup", {
    orderNumber,
    rawPhone: providedPhoneRaw,
    normalizedPhone: providedPhone,
    matchedRecordId: matched ? order.id : null,
  });

  if (!matched) {
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
