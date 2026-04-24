import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPaystackSecretForOrganization } from "@/lib/storefront/config";
import { recordStorefrontMetric } from "@/lib/storefront/metrics";

export async function POST(req: NextRequest, context: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await context.params;
  const { reference } = (await req.json().catch(() => ({}))) as { reference?: string };
  if (!reference) return NextResponse.json({ error: "reference is required" }, { status: 400 });

  const secret = await getPaystackSecretForOrganization(organizationId);
  if (!secret) return NextResponse.json({ error: "Paystack is not configured" }, { status: 400 });

  const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  if (!verifyResponse.ok) {
    const body = await verifyResponse.text();
    return NextResponse.json({ error: "Verification request failed", details: body }, { status: 502 });
  }

  const payload = await verifyResponse.json();
  if (!(payload.status && payload.data?.status === "success")) {
    return NextResponse.json({ error: "Payment not successful" }, { status: 400 });
  }

  const paymentRecord = await db.payment.findUnique({
    where: { reference },
    include: { order: true },
  });
  const order = paymentRecord?.order || await db.order.findUnique({ where: { orderNumber: reference } });
  if (!order) return NextResponse.json({ error: "Order not found for reference" }, { status: 404 });

  await db.payment.upsert({
    where: { reference },
    update: {
      orderId: order.id,
      amount: payload.data.amount / 100,
      currency: payload.data.currency,
      status: "PAID",
      provider: "paystack",
      providerRef: String(payload.data.id),
      paidAt: payload.data.paid_at ? new Date(payload.data.paid_at) : new Date(),
      metadata: payload.data,
    },
    create: {
      orderId: order.id,
      reference,
      amount: payload.data.amount / 100,
      currency: payload.data.currency,
      status: "PAID",
      provider: "paystack",
      providerRef: String(payload.data.id),
      paidAt: payload.data.paid_at ? new Date(payload.data.paid_at) : new Date(),
      metadata: payload.data,
    },
  });

  await db.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      paymentMethod: "PAYSTACK",
    },
  });

  // Mark other pending attempts for this order as failed to keep one successful attempt.
  await db.payment.updateMany({
    where: {
      orderId: order.id,
      reference: { not: reference },
      status: "PENDING",
      provider: "paystack",
    },
    data: {
      status: "FAILED",
    },
  });

  recordStorefrontMetric("storefront.payments.verified", { organizationId, reference });

  return NextResponse.json({
    data: {
      status: "success",
      orderNumber: order.orderNumber,
    },
  });
}
