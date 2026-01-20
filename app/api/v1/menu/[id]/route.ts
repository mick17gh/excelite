import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "menu:read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const item = await db.menuItem.findFirst({
    where: { id, deletedAt: null },
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

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      ...item,
      price: Number(item.price),
      cost: Number(item.cost),
    },
  });
}

