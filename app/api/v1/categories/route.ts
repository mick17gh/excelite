import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "categories:read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const categories = await db.menuItem.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return NextResponse.json({
    data: categories.map((c) => c.category),
  });
}

