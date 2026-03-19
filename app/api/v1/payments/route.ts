import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";

// GET /api/v1/payments - List payments by order
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "orders:read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const payments = await db.payment.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    data: payments.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      reference: p.reference,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      provider: p.provider,
      providerRef: p.providerRef,
      paidAt: p.paidAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}

// POST /api/v1/payments - Record a payment
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "orders:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderId, amount, currency, provider, providerRef } = body;

    if (!orderId || !amount) {
      return NextResponse.json({ error: "orderId and amount are required" }, { status: 400 });
    }

    const reference = `PAY-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    const payment = await db.payment.create({
      data: {
        orderId,
        reference,
        amount,
        currency: currency || "GHS",
        status: "PAID",
        provider: provider || "api",
        providerRef: providerRef || null,
        paidAt: new Date(),
      },
    });

    // Update order payment status
    const order = await db.order.findUnique({ where: { id: orderId }, select: { total: true } });
    if (order) {
      const allPayments = await db.payment.findMany({
        where: { orderId, status: "PAID" },
      });
      const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      if (totalPaid >= Number(order.total)) {
        await db.order.update({
          where: { id: orderId },
          data: { paymentStatus: "PAID", paymentMethod: provider || "api" },
        });
      }
    }

    return NextResponse.json({
      data: {
        id: payment.id,
        reference: payment.reference,
        amount: Number(payment.amount),
        status: payment.status,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/v1/payments] Error:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
