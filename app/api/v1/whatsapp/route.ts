import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/v1/whatsapp - List sessions
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phoneNumber = searchParams.get("phoneNumber");

  if (phoneNumber) {
    const session = await db.whatsAppSession.findUnique({
      where: { phoneNumber },
      include: {
        customer: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: session.id,
        phoneNumber: session.phoneNumber,
        state: session.state,
        customer: session.customer,
        messages: session.messages.map((m) => ({
          id: m.id,
          direction: m.direction,
          content: m.content,
          messageType: m.messageType,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    });
  }

  const sessions = await db.whatsAppSession.findMany({
    include: {
      customer: { select: { id: true, name: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    data: sessions.map((s) => ({
      id: s.id,
      phoneNumber: s.phoneNumber,
      state: s.state,
      customer: s.customer,
      messageCount: s._count.messages,
      lastMessageAt: s.lastMessageAt.toISOString(),
    })),
  });
}

// POST /api/v1/whatsapp - Webhook for incoming messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, content, messageType } = body;

    if (!phoneNumber || !content) {
      return NextResponse.json({ error: "phoneNumber and content are required" }, { status: 400 });
    }

    // Find or create session
    let session = await db.whatsAppSession.findUnique({ where: { phoneNumber } });

    if (!session) {
      // Try to find existing customer by phone
      const customer = await db.customer.findUnique({ where: { phone: phoneNumber } });

      session = await db.whatsAppSession.create({
        data: {
          phoneNumber,
          customerId: customer?.id || null,
          state: "GREETING",
          lastMessageAt: new Date(),
        },
      });
    } else {
      await db.whatsAppSession.update({
        where: { id: session.id },
        data: { lastMessageAt: new Date() },
      });
    }

    // Store message
    const message = await db.whatsAppMessage.create({
      data: {
        sessionId: session.id,
        direction: "inbound",
        content,
        messageType: messageType || "text",
      },
    });

    return NextResponse.json({
      data: {
        sessionId: session.id,
        messageId: message.id,
        state: session.state,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/v1/whatsapp] Error:", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
