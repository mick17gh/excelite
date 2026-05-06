"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { PaymentStatus, SalesChannel } from "@/lib/generated/prisma/client";
import { sendPaymentReceiptSMS } from "@/lib/services/sms-notifications";
import { deductInventoryForSale } from "@/lib/services/inventory-deduction";
import { decryptSecret } from "@/lib/storefront/paystack";

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

function resolvePaystackCredentials(org: {
  paystackEnabled: boolean | null;
  features: unknown;
  paystackPublicKey: string | null;
  paystackSecretKey: string | null;
}) {
  const featureEnabled =
    org.paystackEnabled || (org.features as Record<string, unknown> | null)?.paystackEnabled === true;
  const publicKey = org.paystackPublicKey || process.env.PAYSTACK_PUBLIC_KEY || null;
  const secret = decryptSecret(org.paystackSecretKey) || process.env.PAYSTACK_SECRET_KEY || null;
  return {
    enabled: Boolean(featureEnabled && publicKey && secret),
    publicKey,
    secret,
  };
}

async function initializePaystackTransaction(params: {
  secret: string;
  email: string;
  amount: number;
  reference: string;
  callbackUrl: string;
  currency: string;
  metadata: Record<string, unknown>;
}) {
  return fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      callback_url: params.callbackUrl,
      currency: params.currency,
      metadata: params.metadata,
    }),
  });
}

async function settleOrderIfFullyPaid(orderId: string, paymentMethod: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { menuItem: { select: { cost: true } } } },
      payments: { where: { status: "PAID" } },
    },
  });

  if (!order) return;

  const totalPaid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  if (totalPaid < Number(order.total)) return;

  const alreadyPaid = order.paymentStatus === "PAID";
  await db.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "PAID",
      paymentMethod,
      orderReceivedTime: order.orderReceivedTime || new Date(),
    },
  });

  if (alreadyPaid) return;

  const transactionRef = `TXN-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const transaction = await db.transaction.create({
    data: {
      transactionRef,
      branchId: order.branchId,
      paymentMethod,
      amount: Number(order.total),
      tip: 0,
      transactionDate: new Date(),
    },
  });

  const saleNumber = `SALE-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  const hour = new Date().getHours();
  let dayPart: "BREAKFAST" | "LUNCH" | "DINNER" | "LATE_NIGHT" = "LATE_NIGHT";
  if (hour >= 6 && hour < 11) dayPart = "BREAKFAST";
  else if (hour >= 11 && hour < 15) dayPart = "LUNCH";
  else if (hour >= 15 && hour < 21) dayPart = "DINNER";

  const channelMap: Record<string, SalesChannel> = {
    DINE_IN: "DINE_IN",
    TAKEOUT: "TAKEOUT",
    DELIVERY: "DELIVERY",
    APP: "APP",
  };
  const channel = channelMap[order.type] || "DINE_IN";

  await db.sale.create({
    data: {
      saleNumber,
      branchId: order.branchId,
      transactionId: transaction.id,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      channel,
      dayPart,
      customerCount: 1,
      saleDate: new Date(),
      items: {
        create: order.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitCost: item.menuItem?.cost || 0,
          total: item.lineTotal,
          discount: 0,
        })),
      },
    },
  });

  try {
    await deductInventoryForSale(
      order.items.map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity })),
      order.branchId,
      order.id
    );
  } catch (err) {
    console.warn("[settleOrderIfFullyPaid] Inventory deduction failed:", err);
  }

  try {
    await sendPaymentReceiptSMS(order.id);
  } catch (err) {
    console.warn("[settleOrderIfFullyPaid] Failed to send payment receipt SMS:", err);
  }
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

    await settleOrderIfFullyPaid(input.orderId, input.paymentMethod || input.provider || "manual");

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
            organizationId: true,
            currency: true,
            organization: {
              select: {
                features: true,
                paystackEnabled: true,
                paystackPublicKey: true,
                paystackSecretKey: true,
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

    const reference = buildPaystackReference(order.orderNumber);
    const payload = {
      email: input.email,
      amount: Math.round(Number(order.total) * 100),
      reference,
      callbackUrl: input.callbackUrl,
      currency: order.branch.currency || "GHS",
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        organizationId: order.branch.organizationId,
        source: "dashboard-orders",
      },
    };

    let initResponse = await initializePaystackTransaction({
      secret: credentials.secret,
      ...payload,
    });

    if (!initResponse.ok) {
      let body = await initResponse.text();
      let detail = body;
      try {
        const parsed = JSON.parse(body) as { message?: string };
        detail = parsed.message || body;
      } catch {
        // Keep raw body if it's not JSON.
      }
      const envSecret = process.env.PAYSTACK_SECRET_KEY || null;
      const canRetryWithEnv =
        detail.toLowerCase().includes("invalid key") &&
        Boolean(envSecret) &&
        envSecret !== credentials.secret;
      if (canRetryWithEnv && envSecret) {
        initResponse = await initializePaystackTransaction({
          secret: envSecret,
          ...payload,
        });
        if (initResponse.ok) {
          detail = "";
        } else {
          body = await initResponse.text();
          try {
            const parsed = JSON.parse(body) as { message?: string };
            detail = parsed.message || body;
          } catch {
            detail = body;
          }
        }
      }
      if (!initResponse.ok) {
      console.error("[initializePaystackOrderPayment] Paystack initialize failed:", detail);
      return { error: "Failed to initialize payment", details: detail };
      }
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
                paystackEnabled: true,
                paystackPublicKey: true,
                paystackSecretKey: true,
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

    let verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${input.reference}`, {
      headers: { Authorization: `Bearer ${credentials.secret}` },
    });
    if (!verifyResponse.ok) {
      let body = await verifyResponse.text();
      let detail = body;
      try {
        const parsed = JSON.parse(body) as { message?: string };
        detail = parsed.message || body;
      } catch {
        // keep raw text
      }
      const envSecret = process.env.PAYSTACK_SECRET_KEY || null;
      const canRetryWithEnv =
        detail.toLowerCase().includes("invalid key") &&
        Boolean(envSecret) &&
        envSecret !== credentials.secret;
      if (canRetryWithEnv && envSecret) {
        verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${input.reference}`, {
          headers: { Authorization: `Bearer ${envSecret}` },
        });
        if (!verifyResponse.ok) {
          body = await verifyResponse.text();
          try {
            const parsed = JSON.parse(body) as { message?: string };
            detail = parsed.message || body;
          } catch {
            detail = body;
          }
        }
      }
      if (!verifyResponse.ok) {
        return { error: "Verification request failed", details: detail };
      }
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

    await settleOrderIfFullyPaid(order.id, "PAYSTACK");

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard");

    return { data: { status: "success", orderNumber: order.orderNumber } };
  } catch (error) {
    console.error("[verifyPaystackOrderPayment] Error:", error);
    return { error: "Failed to verify Paystack payment" };
  }
}
