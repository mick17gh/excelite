import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "branches:read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const branches = await db.branch.findMany({
    where: {
      deletedAt: null,
      ...(auth.branchId ? { id: auth.branchId } : {}),
    },
    select: {
      id: true,
      name: true,
      code: true,
      city: true,
      country: true,
      currency: true,
      timezone: true,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: branches });
}

