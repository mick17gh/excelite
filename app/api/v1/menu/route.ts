import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";
import { getOrganizationForStorefront, isStorefrontEnabledForOrg } from "@/lib/storefront/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const publicMode = url.searchParams.get("public") === "true";
  const organizationId = url.searchParams.get("organizationId");
  const categoryId = url.searchParams.get("categoryId");

  if (publicMode && organizationId) {
    const org = await getOrganizationForStorefront(organizationId);
    if (!org) {
      return NextResponse.json({ success: false, data: null, error: "Store not found" }, { status: 404 });
    }
    if (!isStorefrontEnabledForOrg(org)) {
      return NextResponse.json({ success: false, data: null, error: "Store temporarily closed" }, { status: 503 });
    }

    const publicItems = await db.menuItem.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: publicItems.map((i) => ({
        id: i.id,
        name: i.name,
        sku: i.sku,
        categoryId: i.categoryId,
        category: i.category?.name || null,
        price: Number(i.price),
        imageUrl: i.imageUrl,
        isActive: i.isActive,
        description: i.description,
        dietaryInfo: null,
        updatedAt: i.updatedAt,
        createdAt: i.createdAt,
      })),
      error: null,
      pagination: {
        page: 1,
        limit: publicItems.length,
        total: publicItems.length,
      },
    });
  }

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

