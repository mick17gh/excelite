"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { PaymentStatus } from "@/lib/generated/prisma/client";

export interface RecordPaymentInput {
  orderId: string;
  amount: number;
  currency?: string;
  provider?: string;
  providerRef?: string;
  paymentMethod?: string;
}

export async function getPaymentsByOrder(orderId: string) {
  try {
    const payments = await db.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });

    return {
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
    };
  } catch (error) {
    console.error("[getPaymentsByOrder] Error:", error);
    return { data: [] };
  }
}

export async function recordPayment(input: RecordPaymentInput) {
  try {
    const reference = `PAY-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    const payment = await db.payment.create({
      data: {
        orderId: input.orderId,
        reference,
        amount: input.amount,
        currency: input.currency || "GHS",
        status: "PAID",
        provider: input.provider || "manual",
        providerRef: input.providerRef || null,
        paidAt: new Date(),
      },
    });

    // Update order payment status
    const order = await db.order.findUnique({
      where: { id: input.orderId },
      select: { total: true },
    });

    if (order) {
      const allPayments = await db.payment.findMany({
        where: { orderId: input.orderId, status: "PAID" },
      });
      const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      if (totalPaid >= Number(order.total)) {
        await db.order.update({
          where: { id: input.orderId },
          data: {
            paymentStatus: "PAID",
            paymentMethod: input.paymentMethod || input.provider || "manual",
          },
        });
      }
    }

    revalidatePath("/dashboard/orders");
    return {
      data: {
        id: payment.id,
        orderId: payment.orderId,
        reference: payment.reference,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        provider: payment.provider,
        providerRef: payment.providerRef,
        paidAt: payment.paidAt?.toISOString() || null,
        metadata: payment.metadata,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[recordPayment] Error:", error);
    return { error: "Failed to record payment" };
  }
}

export async function refundPayment(paymentId: string) {
  try {
    const payment = await db.payment.update({
      where: { id: paymentId },
      data: { status: "REFUNDED" },
    });

    // Check if order should be marked as refunded
    const paidPayments = await db.payment.findMany({
      where: { orderId: payment.orderId, status: "PAID" },
    });

    if (paidPayments.length === 0) {
      await db.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: "REFUNDED" },
      });
    }

    revalidatePath("/dashboard/orders");
    return {
      data: {
        id: payment.id,
        orderId: payment.orderId,
        reference: payment.reference,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        provider: payment.provider,
        providerRef: payment.providerRef,
        paidAt: payment.paidAt?.toISOString() || null,
        metadata: payment.metadata,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[refundPayment] Error:", error);
    return { error: "Failed to refund payment" };
  }
}
