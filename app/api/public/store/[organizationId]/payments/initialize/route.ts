import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getPaystackSecretForOrganization } from "@/lib/storefront/config";

const payloadSchema = z.object({
  orderNumber: z.string().min(4),
  email: z.string().email(),
  callbackUrl: z.string().url().optional(),
});

function buildPaystackReference(orderNumber: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PSTK-${orderNumber}-${ts}-${rand}`;
}

export async function POST(req: NextRequest, context: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await context.params;
  const secret = await getPaystackSecretForOrganization(organizationId);
  if (!secret) {
    return NextResponse.json({ error: "Paystack is not configured" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { orderNumber: parsed.data.orderNumber },
    include: { branch: { select: { organizationId: true, currency: true } } },
  });
  if (!order || order.branch.organizationId !== organizationId) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status === "CANCELLED") {
    return NextResponse.json({ error: "Cannot initialize payment for cancelled order" }, { status: 400 });
  }
  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ error: "Order is already paid" }, { status: 409 });
  }

  const reference = buildPaystackReference(order.orderNumber);

  const initResponse = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: parsed.data.email,
      amount: Math.round(Number(order.total) * 100),
      reference,
      callback_url: parsed.data.callbackUrl,
      currency: order.branch.currency || "GHS",
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        organizationId,
      },
    }),
  });

  if (!initResponse.ok) {
    const body = await initResponse.text();
    return NextResponse.json({ error: "Failed to initialize payment", details: body }, { status: 502 });
  }

  const data = await initResponse.json();
  await db.payment.create({
    data: {
      orderId: order.id,
      reference,
      amount: Number(order.total),
      currency: order.branch.currency || "GHS",
      status: "PENDING",
      provider: "paystack",
      metadata: {
        phase: "initialize",
        paystack: data.data,
      },
    },
  });

  return NextResponse.json({
    data: {
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference,
    },
  });
}
