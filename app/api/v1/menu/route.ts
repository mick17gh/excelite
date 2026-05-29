import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";
import { getOrganizationForStorefront, isStorefrontEnabledForOrg } from "@/lib/storefront/config";
import { menuItemVisibilityWhere } from "@/lib/menu/branch-availability";
import { isBlockingSalesWhenOutOfStock } from "@/lib/inventory/sales-stock-policy";
import { filterSellableMenuItemIds } from "@/lib/services/menu-stock-availability";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const publicMode = url.searchParams.get("public") === "true";
  const organizationId = url.searchParams.get("organizationId");
  const categoryId = url.searchParams.get("categoryId");
  const branchId = url.searchParams.get("branchId");

  if (publicMode && organizationId) {
    const org = await getOrganizationForStorefront(organizationId);
    if (!org) {
      return NextResponse.json({ success: false, data: null, error: "Store not found" }, { status: 404 });
    }
    if (!isStorefrontEnabledForOrg(org)) {
      return NextResponse.json({ success: false, data: null, error: "Store temporarily closed" }, { status: 503 });
    }

    if (branchId) {
      const branchAllowed = org.branches.some((b) => b.id === branchId);
      if (!branchAllowed) {
        return NextResponse.json(
          { success: false, data: null, error: "Invalid branch for this store" },
          { status: 400 }
        );
      }
    }

    const publicItems = await db.menuItem.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(categoryId ? { categoryId } : {}),
        ...(branchId ? menuItemVisibilityWhere(branchId) : {}),
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        optionGroups: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            options: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                name: true,
                sortOrder: true,
                priceDelta: true,
                sku: true,
                isDefault: true,
              },
            },
          },
        },
      },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    });

    let visibleItems = publicItems;
    if (branchId) {
      const blocking = await isBlockingSalesWhenOutOfStock(branchId);
      if (blocking && visibleItems.length > 0) {
        const sellable = await filterSellableMenuItemIds(
          branchId,
          visibleItems.map((i) => i.id)
        );
        visibleItems = visibleItems.filter((i) => sellable.has(i.id));
      }
    }

    return NextResponse.json({
      success: true,
      data: visibleItems.map((i) => ({
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
        optionGroups: i.optionGroups.map((g) => ({
          id: g.id,
          name: g.name,
          sortOrder: g.sortOrder,
          isRequired: g.isRequired,
          minSelections: g.minSelections,
          maxSelections: g.maxSelections,
          options: g.options.map((o) => ({
            id: o.id,
            name: o.name,
            sortOrder: o.sortOrder,
            priceDelta: Number(o.priceDelta),
            sku: o.sku,
            isDefault: o.isDefault,
          })),
        })),
      })),
      error: null,
      pagination: {
        page: 1,
        limit: visibleItems.length,
        total: visibleItems.length,
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
    include: {
      category: { select: { id: true, name: true } },
      optionGroups: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          options: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              sortOrder: true,
              priceDelta: true,
              sku: true,
              isDefault: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: items.map((i) => ({
      id: i.id,
      name: i.name,
      sku: i.sku,
      categoryId: i.categoryId,
      category: i.category?.name || null,
      price: Number(i.price),
      cost: i.cost ? Number(i.cost) : null,
      imageUrl: i.imageUrl,
      isActive: i.isActive,
      description: i.description,
      updatedAt: i.updatedAt,
      createdAt: i.createdAt,
      optionGroups: i.optionGroups.map((g) => ({
        id: g.id,
        name: g.name,
        sortOrder: g.sortOrder,
        isRequired: g.isRequired,
        minSelections: g.minSelections,
        maxSelections: g.maxSelections,
        options: g.options.map((o) => ({
          id: o.id,
          name: o.name,
          sortOrder: o.sortOrder,
          priceDelta: Number(o.priceDelta),
          sku: o.sku,
          isDefault: o.isDefault,
        })),
      })),
    })),
    error: null,
    pagination: {
      page: 1,
      limit: items.length,
      total: items.length
    }
  });
}

