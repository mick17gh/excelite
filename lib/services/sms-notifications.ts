"use server";

import { db } from "@/lib/db";
import { sendSMS } from "@/lib/services/sms";

/**
 * Auto-send SMS notification for payment receipt
 * Only sends if customer has name and phone
 */
export async function sendPaymentReceiptSMS(orderId: string) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { name: true, phone: true } },
        branch: { select: { name: true } },
      },
    });

    if (!order) return;

    // Only send if we have customer name and phone
    const customerName = order.customer?.name || order.customerName;
    const customerPhone = order.customer?.phone || order.deliveryPhone;

    if (!customerName || !customerPhone) return;

    const message = `Hi ${customerName}, your payment of GHS ${Number(order.total).toFixed(2)} has been received for order #${order.orderNumber} at ${order.branch?.name || "our restaurant"}. Thank you!`;

    // Send actual SMS via MNotify
    const smsResult = await sendSMS(customerPhone, message);

    // Log notification in database
    await db.orderNotification.create({
      data: {
        orderId: order.id,
        type: "PAYMENT_RECEIVED",
        channel: "SMS",
        recipient: customerPhone,
        message,
        status: smsResult.success ? "SENT" : "FAILED",
        sentAt: smsResult.success ? new Date() : null,
        error: smsResult.success ? null : smsResult.message,
      },
    });
  } catch (error) {
    console.warn("[sendPaymentReceiptSMS] Failed:", error);
    // Non-fatal: don't block payment flow
  }
}

/**
 * Auto-send SMS notification when order is placed
 * Only sends if customer has name and phone
 */
export async function sendOrderPlacedSMS(orderId: string) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { name: true, phone: true } },
        branch: { select: { name: true } },
      },
    });

    if (!order) return;

    const customerName = order.customer?.name || order.customerName;
    const customerPhone = order.customer?.phone || order.deliveryPhone;
    if (!customerName || !customerPhone) return;

    const message = `Hi ${customerName}, your order #${order.orderNumber}${order.branch?.name ? ` at ${order.branch.name}` : ""} has been received. If you haven't paid yet, please complete payment to confirm your order. We'll notify you when it's ready.`;
    const smsResult = await sendSMS(customerPhone, message);

    await db.orderNotification.create({
      data: {
        orderId: order.id,
        type: "ORDER_PLACED",
        channel: "SMS",
        recipient: customerPhone,
        message,
        status: smsResult.success ? "SENT" : "FAILED",
        sentAt: smsResult.success ? new Date() : null,
        error: smsResult.success ? null : smsResult.message,
      },
    });
  } catch (error) {
    console.warn("[sendOrderPlacedSMS] Failed:", error);
    // Non-fatal: don't block order creation flow
  }
}

/**
 * Auto-send SMS notification when order is ready
 * Only sends if customer has name and phone
 */
export async function sendOrderReadySMS(orderId: string) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { name: true, phone: true } },
        branch: { select: { name: true } },
      },
    });

    if (!order) return;

    // Only send if we have customer name and phone
    const customerName = order.customer?.name || order.customerName;
    const customerPhone = order.customer?.phone || order.deliveryPhone;

    if (!customerName || !customerPhone) return;

    const message = `Hi ${customerName}, your order #${order.orderNumber} is ready for ${order.type === "DELIVERY" ? "delivery" : order.type === "TAKEOUT" ? "pickup" : "serving"}! ${order.branch?.name || ""}`;

    // Send actual SMS via MNotify
    const smsResult = await sendSMS(customerPhone, message);

    // Log notification in database
    await db.orderNotification.create({
      data: {
        orderId: order.id,
        type: "ORDER_READY",
        channel: "SMS",
        recipient: customerPhone,
        message,
        status: smsResult.success ? "SENT" : "FAILED",
        sentAt: smsResult.success ? new Date() : null,
        error: smsResult.success ? null : smsResult.message,
      },
    });
  } catch (error) {
    console.warn("[sendOrderReadySMS] Failed:", error);
    // Non-fatal: don't block order status update
  }
}
