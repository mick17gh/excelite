import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isValidFourDigitPin } from "@/lib/auth/credential-password";

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const current = attempts.get(ip);
  if (!current || current.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  attempts.set(ip, current);
  return current.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 429 });
    }

    const body = (await req.json().catch(() => null)) as
      | { pin?: string; rememberMe?: boolean }
      | null;
    const pin = body?.pin?.trim() || "";
    const rememberMe = body?.rememberMe !== false;

    if (!isValidFourDigitPin(pin)) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    const candidates = await db.user.findMany({
      where: {
        pinHash: { not: null },
        isActive: true,
        deletedAt: null,
      },
      select: {
        email: true,
        pinHash: true,
      },
    });

    const matchedEmails: string[] = [];
    for (const user of candidates) {
      if (user.pinHash && (await bcrypt.compare(pin, user.pinHash))) {
        matchedEmails.push(user.email);
      }
    }

    if (matchedEmails.length !== 1) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    const signInResponse = await auth.api.signInEmail({
      body: {
        email: matchedEmails[0],
        password: pin,
        rememberMe,
      },
      headers: req.headers,
      asResponse: true,
    });

    if (!signInResponse.ok) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    return signInResponse;
  } catch (error) {
    console.error("[pin-login] Error:", error);
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }
}
