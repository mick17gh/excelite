"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { NotificationType } from "@/lib/generated/prisma/client";

export interface SendNotificationInput {
  orderId: string;
  type: NotificationType;
  channel: string;
  recipient: string;
  subject?: string;
  message: string;
}

export async function getOrderNotifications(orderId: string) {
  try {
    const notifications = await db.orderNotification.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: notifications.map((n) => ({
        id: n.id,
        orderId: n.orderId,
        type: n.type,
        channel: n.channel,
        recipient: n.recipient,
        subject: n.subject,
        message: n.message,
        status: n.status,
        sentAt: n.sentAt?.toISOString() || null,
        error: n.error,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[getOrderNotifications] Error:", error);
    return { data: [] };
  }
}

export async function sendOrderNotification(input: SendNotificationInput) {
  try {
    const notification = await db.orderNotification.create({
      data: {
        orderId: input.orderId,
        type: input.type,
        channel: input.channel,
        recipient: input.recipient,
        subject: input.subject || null,
        message: input.message,
        status: "SENT",
        sentAt: new Date(),
      },
    });

    revalidatePath("/dashboard/orders");
    return { data: notification };
  } catch (error) {
    console.error("[sendOrderNotification] Error:", error);
    return { error: "Failed to send notification" };
  }
}
