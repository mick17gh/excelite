import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "menu:read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const items = await db.menuItem.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      price: true,
      cost: true,
      imageUrl: true,
      isActive: true,
      description: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    data: items.map((i) => ({
      ...i,
      price: Number(i.price),
      cost: Number(i.cost),
    })),
  });
}

