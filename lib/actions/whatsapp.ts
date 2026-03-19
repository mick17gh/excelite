"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getWhatsAppSessions(filters?: {
  state?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;

    const where: Record<string, unknown> = {};
    if (filters?.state) where.state = filters.state;

    const [sessions, total] = await Promise.all([
      db.whatsAppSession.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { lastMessageAt: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      db.whatsAppSession.count({ where }),
    ]);

    return {
      data: sessions.map((s) => ({
        id: s.id,
        phoneNumber: s.phoneNumber,
        customerId: s.customerId,
        customerName: s.customer?.name || null,
        state: s.state,
        cartData: s.cartData as Record<string, unknown> | null,
        messageCount: s._count.messages,
        lastMessageAt: s.lastMessageAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("[getWhatsAppSessions] Error:", error);
    return { data: [], total: 0, page: 1, pageSize: 50 };
  }
}

export async function getWhatsAppMessages(sessionId: string) {
  try {
    const messages = await db.whatsAppMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return {
      data: messages.map((m) => ({
        id: m.id,
        sessionId: m.sessionId,
        direction: m.direction,
        content: m.content,
        messageType: m.messageType,
        metadata: m.metadata as Record<string, unknown> | null,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[getWhatsAppMessages] Error:", error);
    return { data: [] };
  }
}

export async function linkSessionToCustomer(sessionId: string, customerId: string) {
  try {
    await db.whatsAppSession.update({
      where: { id: sessionId },
      data: { customerId },
    });

    revalidatePath("/dashboard/orders");
    return { success: true };
  } catch (error) {
    console.error("[linkSessionToCustomer] Error:", error);
    return { error: "Failed to link session" };
  }
}

export async function getWhatsAppStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalSessions, activeSessions, todayMessages] = await Promise.all([
      db.whatsAppSession.count(),
      db.whatsAppSession.count({ where: { state: { not: "IDLE" } } }),
      db.whatsAppMessage.count({ where: { createdAt: { gte: today } } }),
    ]);

    return { data: { totalSessions, activeSessions, todayMessages } };
  } catch (error) {
    console.error("[getWhatsAppStats] Error:", error);
    return { data: { totalSessions: 0, activeSessions: 0, todayMessages: 0 } };
  }
}
