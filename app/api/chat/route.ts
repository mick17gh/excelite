import { NextRequest, NextResponse } from 'next/server';
import { Role, SubscriptionTier } from '@/lib/generated/prisma/client';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { chatService } from '@/lib/ai';
import type { LLMProvider, SelectionMode, LLMMessage } from '@/lib/ai/types';
import { db } from '@/lib/db';
import { hasFeature } from '@/lib/tier-config';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ChatRequestBody {
  message: string;
  sessionId: string;
  provider?: LLMProvider;
  selectionMode?: SelectionMode;
  previousMessages?: LLMMessage[];
  stream?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user;
    const userRole = (user.role as Role) || Role.BRANCH_MANAGER;

    // Enforce tier-level access for AI assistant at API layer.
    const org = await db.organization.findFirst({ select: { tier: true } });
    const orgTier: SubscriptionTier = org?.tier || "FREE";
    if (!hasFeature(orgTier, "aiAssistant", userRole)) {
      return NextResponse.json(
        { error: 'AI Assistant is not available on your current plan' },
        { status: 403 }
      );
    }

    const body: ChatRequestBody = await request.json();

    // Validate request
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (body.message.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    const chatRequest = {
      message: body.message,
      context: {
        userId: user.id,
        userRole,
        branchId: user.branchId || null,
        sessionId: body.sessionId || 'default',
        previousMessages: body.previousMessages || [],
      },
      provider: body.provider,
      selectionMode: body.selectionMode,
      stream: body.stream,
    };

    // Handle streaming response
    if (body.stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const generator = chatService.streamMessage(chatRequest);
            let finalResponse;

            for await (const chunk of generator) {
              if (typeof chunk === 'string') {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
                );
              } else {
                finalResponse = chunk;
              }
            }

            // Send final metadata
            if (finalResponse) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ done: true, metadata: finalResponse })}\n\n`
                )
              );
            }

            controller.close();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming response
    const response = await chatService.processMessage(chatRequest);

    return NextResponse.json({
      success: true,
      data: {
        content: response.content,
        provider: response.provider,
        model: response.model,
        usage: response.usage,
        latencyMs: response.latencyMs,
        cached: response.cached,
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
