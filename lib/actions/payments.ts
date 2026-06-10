"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { PaymentStatus } from "@/lib/generated/prisma/client";
import {
  getEnvPaystackSecretKey,
  isPaystackDashboardEnabledForOrg,
  type PaystackOrgFlags,
} from "@/lib/paystack/credentials";
import { buildPaystackInitializeBody } from "@/lib/paystack/initialize";
import { resolveBranchSubaccountForCheckout } from "@/lib/paystack/order-settlement";
import { finalizeOrderFromExistingPayments } from "@/lib/payments/settle-order";
import {
  normalizePaymentMethod,
  roundMoney,
  validateTenders,
  type PaymentTender,
} from "@/lib/payments/tenders";

export interface RecordPaymentInput {
  orderId: string;
  amount: number;
  currency?: string;
  provider?: string;
  providerRef?: string;
  paymentMethod?: string;
}

export interface InitializePaystackOrderPaymentInput {
  orderId: string;
  email: string;
  callbackUrl: string;
}

function buildPaystackReference(orderNumber: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PSTK-${orderNumber}-${ts}-${rand}`;
}

function resolvePaystackCredentials(org: PaystackOrgFlags) {
  const secret = getEnvPaystackSecretKey();
  return {
    enabled: isPaystackDashboardEnabledForOrg(org),
    secret,
  };
}

async function initializePaystackTransaction(params: {
  secret: string;
  body: Record<string, unknown>;
}) {
  return fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params.body),
  });
}

async function settleOrderIfFullyPaid(orderId: string) {
  await finalizeOrderFromExistingPayments(orderId);
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
        paymentMethod: p.paymentMethod,
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

    const method =
      normalizePaymentMethod(input.paymentMethod || input.provider || "cash") || "CASH";

    const payment = await db.payment.create({
      data: {
        orderId: input.orderId,
        reference,
        amount: input.amount,
        currency: input.currency || "GHS",
        status: "PAID",
        provider: input.provider || "manual",
        paymentMethod: method,
        providerRef: input.providerRef || null,
        paidAt: new Date(),
      },
    });

    await settleOrderIfFullyPaid(input.orderId);

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard");
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

export async function recordSplitPayment(input: {
  orderId: string;
  tenders: PaymentTender[];
}) {
  try {
    const order = await db.order.findUnique({
      where: { id: input.orderId },
      include: { payments: { where: { status: "PAID" } } },
    });
    if (!order) return { error: "Order not found" };
    if (order.paymentStatus === "PAID") return { error: "Order is already paid" };

    const totalPaid = roundMoney(
      order.payments.reduce((sum, p) => sum + Number(p.amount), 0),
    );
    const orderTotal = roundMoney(Number(order.total));
    const remaining = roundMoney(orderTotal - totalPaid);

    const validation = validateTenders(remaining, input.tenders);
    if (!validation.ok) return { error: validation.error };

    await db.$transaction(async (tx) => {
      for (const tender of input.tenders) {
        const reference = `PAY-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
        await tx.payment.create({
          data: {
            orderId: input.orderId,
            reference,
            amount: tender.amount,
            currency: "GHS",
            status: "PAID",
            provider: "manual",
            paymentMethod: tender.method,
            providerRef: tender.reference?.trim() || null,
            paidAt: new Date(),
          },
        });
      }
    });

    await settleOrderIfFullyPaid(input.orderId);

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[recordSplitPayment] Error:", error);
    return { error: "Failed to record split payment" };
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

export async function initializePaystackOrderPayment(input: InitializePaystackOrderPaymentInput) {
  try {
    const order = await db.order.findUnique({
      where: { id: input.orderId },
      include: {
        branch: {
          select: {
            id: true,
            organizationId: true,
            currency: true,
            paystackSubaccountCode: true,
            paystackSubaccountActive: true,
            organization: {
              select: {
                features: true,
                paystackEnabled: true,
                paystackDashboardEnabled: true,
              },
            },
          },
        },
      },
    });

    if (!order) return { error: "Order not found" };
    if (order.paymentStatus === "PAID") return { error: "Order is already paid" };
    if (order.status === "CANCELLED") return { error: "Cannot initialize payment for cancelled order" };

    const org = order.branch.organization;
    if (!org) {
      return { error: "Organization not found for branch" };
    }
    const credentials = resolvePaystackCredentials(org);
    if (!credentials.enabled || !credentials.secret) {
      return { error: "Paystack is disabled in setup or not fully configured" };
    }

    const settlement = resolveBranchSubaccountForCheckout(
      org,
      order.branch,
      "dashboard",
    );
    if (!settlement.ok) {
      return { error: settlement.error };
    }

    const reference = buildPaystackReference(order.orderNumber);
    const initBody = buildPaystackInitializeBody({
      email: input.email,
      amount: Math.round(Number(order.total) * 100),
      reference,
      callbackUrl: input.callbackUrl,
      currency: order.branch.currency || "GHS",
      subaccountCode: settlement.subaccountCode,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        organizationId: order.branch.organizationId,
        branchId: order.branch.id,
        source: "dashboard-orders",
      },
    });

    let initResponse = await initializePaystackTransaction({
      secret: credentials.secret,
      body: initBody,
    });

    if (!initResponse.ok) {
      const body = await initResponse.text();
      let detail = body;
      try {
        const parsed = JSON.parse(body) as { message?: string };
        detail = parsed.message || body;
      } catch {
        // Keep raw body if it's not JSON.
      }
      console.error("[initializePaystackOrderPayment] Paystack initialize failed:", detail);
      return { error: "Failed to initialize payment", details: detail };
    }

    const paystackPayload = await initResponse.json();
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
          paystack: paystackPayload.data,
          source: "dashboard-orders",
        },
      },
    });

    return {
      data: {
        authorizationUrl: paystackPayload.data.authorization_url as string,
        accessCode: paystackPayload.data.access_code as string,
        reference,
      },
    };
  } catch (error) {
    console.error("[initializePaystackOrderPayment] Error:", error);
    return {
      error: "Failed to initialize Paystack payment",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function verifyPaystackOrderPayment(input: { orderId: string; reference: string }) {
  try {
    const order = await db.order.findUnique({
      where: { id: input.orderId },
      include: {
        branch: {
          select: {
            organization: {
              select: {
                features: true,
                paystackDashboardEnabled: true,
              },
            },
          },
        },
      },
    });

    if (!order) return { error: "Order not found" };
    const org = order.branch.organization;
    if (!org) return { error: "Organization not found for branch" };
    const credentials = resolvePaystackCredentials(org);
    if (!credentials.secret) return { error: "Paystack secret key is not configured" };

    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${input.reference}`, {
      headers: { Authorization: `Bearer ${credentials.secret}` },
    });
    if (!verifyResponse.ok) {
      const body = await verifyResponse.text();
      let detail = body;
      try {
        const parsed = JSON.parse(body) as { message?: string };
        detail = parsed.message || body;
      } catch {
        // keep raw text
      }
      return { error: "Verification request failed", details: detail };
    }

    const payload = await verifyResponse.json();
    if (!(payload.status && payload.data?.status === "success")) {
      return { error: "Payment not successful" };
    }

    await db.payment.upsert({
      where: { reference: input.reference },
      update: {
        orderId: order.id,
        amount: payload.data.amount / 100,
        currency: payload.data.currency,
        status: "PAID",
        provider: "paystack",
        paymentMethod: "CARD",
        providerRef: String(payload.data.id),
        paidAt: payload.data.paid_at ? new Date(payload.data.paid_at) : new Date(),
        metadata: payload.data,
      },
      create: {
        orderId: order.id,
        reference: input.reference,
        amount: payload.data.amount / 100,
        currency: payload.data.currency,
        status: "PAID",
        provider: "paystack",
        paymentMethod: "CARD",
        providerRef: String(payload.data.id),
        paidAt: payload.data.paid_at ? new Date(payload.data.paid_at) : new Date(),
        metadata: payload.data,
      },
    });

    await db.payment.updateMany({
      where: {
        orderId: order.id,
        reference: { not: input.reference },
        status: "PENDING",
        provider: "paystack",
      },
      data: { status: "FAILED" },
    });

    await settleOrderIfFullyPaid(order.id);

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard");

    return { data: { status: "success", orderNumber: order.orderNumber } };
  } catch (error) {
    console.error("[verifyPaystackOrderPayment] Error:", error);
    return { error: "Failed to verify Paystack payment" };
  }
}
