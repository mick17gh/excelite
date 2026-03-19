"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface GenerateReceiptInput {
  orderId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  paymentMethod: string;
}

export async function getReceiptByOrder(orderId: string) {
  try {
    const receipt = await db.receipt.findUnique({
      where: { orderId },
    });

    if (!receipt) return { data: null };

    return {
      data: {
        id: receipt.id,
        orderId: receipt.orderId,
        receiptNumber: receipt.receiptNumber,
        customerName: receipt.customerName,
        customerPhone: receipt.customerPhone,
        customerEmail: receipt.customerEmail,
        items: receipt.items as Record<string, unknown>[],
        subtotal: Number(receipt.subtotal),
        tax: Number(receipt.tax),
        discount: Number(receipt.discount),
        deliveryFee: Number(receipt.deliveryFee),
        total: Number(receipt.total),
        paymentMethod: receipt.paymentMethod,
        pdfUrl: receipt.pdfUrl,
        sentVia: receipt.sentVia,
        createdAt: receipt.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[getReceiptByOrder] Error:", error);
    return { data: null };
  }
}

export async function generateReceipt(input: GenerateReceiptInput) {
  try {
    const existing = await db.receipt.findUnique({ where: { orderId: input.orderId } });
    if (existing) return { data: existing };

    const order = await db.order.findUnique({
      where: { id: input.orderId },
      include: {
        items: {
          include: { menuItem: { select: { name: true, sku: true } } },
        },
      },
    });

    if (!order) return { error: "Order not found" };

    const receiptNumber = `RCT-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    const items = order.items.map((item) => ({
      name: item.menuItem?.name || "Unknown",
      sku: item.menuItem?.sku || "",
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    }));

    const receipt = await db.receipt.create({
      data: {
        orderId: input.orderId,
        receiptNumber,
        customerName: input.customerName,
        customerPhone: input.customerPhone || null,
        customerEmail: input.customerEmail || null,
        items: items as any,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        discount: Number(order.discount),
        deliveryFee: Number(order.deliveryFee),
        total: Number(order.total),
        paymentMethod: input.paymentMethod,
        sentVia: [],
      },
    });

    revalidatePath("/dashboard/orders");
    return { data: receipt };
  } catch (error) {
    console.error("[generateReceipt] Error:", error);
    return { error: "Failed to generate receipt" };
  }
}
