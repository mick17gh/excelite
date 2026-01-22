import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";

export async function GET(request: Request) {
  // Support both x-api-key and Authorization Bearer formats
  let apiKey = request.headers.get("x-api-key");
  
  if (!apiKey) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      apiKey = authHeader.substring(7);
    }
  }
  
  const auth = await authenticateApiKey(apiKey, "menu:read");
  if (!auth.ok) {
    return NextResponse.json({ 
      success: false, 
      data: null, 
      error: auth.error 
    }, { status: 401 });
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
    success: true,
    data: items.map((i) => ({
      ...i,
      price: Number(i.price),
      cost: i.cost ? Number(i.cost) : null,
    })),
    error: null,
    pagination: {
      page: 1,
      limit: items.length,
      total: items.length
    }
  });
}

