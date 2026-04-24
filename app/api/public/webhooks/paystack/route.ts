import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPaystackSecretForOrganization } from "@/lib/storefront/config";

function verifyPaystackSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");
  return hash === signature;
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-paystack-signature");
  const rawBody = await req.text();

  const event = JSON.parse(rawBody) as {
    event?: string;
    data?: { reference?: string; amount?: number; currency?: string; id?: string; paid_at?: string; metadata?: { organizationId?: string } };
  };

  const organizationId = event.data?.metadata?.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "Missing organization metadata" }, { status: 400 });
  }

  const secret = await getPaystackSecretForOrganization(organizationId);
  if (!secret || !verifyPaystackSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  if (event.event !== "charge.success" || !event.data?.reference) {
    return NextResponse.json({ ok: true });
  }

  const paymentRecord = await db.payment.findUnique({
    where: { reference: event.data.reference },
    include: { order: true },
  });
  const order = paymentRecord?.order || await db.order.findUnique({ where: { orderNumber: event.data.reference } });
  if (!order) {
    return NextResponse.json({ error: "Order not found for reference" }, { status: 404 });
  }

  await db.payment.upsert({
    where: { reference: event.data.reference },
    update: {
      status: "PAID",
      amount: (event.data.amount || 0) / 100,
      currency: event.data.currency || "GHS",
      providerRef: String(event.data.id || ""),
      paidAt: event.data.paid_at ? new Date(event.data.paid_at) : new Date(),
      metadata: event.data,
    },
    create: {
      orderId: order.id,
      reference: event.data.reference,
      status: "PAID",
      amount: (event.data.amount || 0) / 100,
      currency: event.data.currency || "GHS",
      provider: "paystack",
      providerRef: String(event.data.id || ""),
      paidAt: event.data.paid_at ? new Date(event.data.paid_at) : new Date(),
      metadata: event.data,
    },
  });

  await db.order.update({
    where: { id: order.id },
    data: { paymentStatus: "PAID", paymentMethod: "PAYSTACK" },
  });

  await db.payment.updateMany({
    where: {
      orderId: order.id,
      reference: { not: event.data.reference },
      status: "PENDING",
      provider: "paystack",
    },
    data: { status: "FAILED" },
  });

  return NextResponse.json({ ok: true });
}
