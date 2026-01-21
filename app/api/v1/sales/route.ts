import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";

// GET /api/v1/sales - Get sales data
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "sales:read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId") || auth.branchId;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = parseInt(searchParams.get("limit") || "100");
  const offset = parseInt(searchParams.get("offset") || "0");

  const whereClause: Record<string, unknown> = {
    deletedAt: null,
  };

  if (branchId) {
    whereClause.branchId = branchId;
  }

  if (startDate || endDate) {
    whereClause.saleDate = {};
    if (startDate) {
      (whereClause.saleDate as Record<string, Date>).gte = new Date(startDate);
    }
    if (endDate) {
      (whereClause.saleDate as Record<string, Date>).lte = new Date(endDate);
    }
  }

  const [sales, total] = await Promise.all([
    db.sale.findMany({
      where: whereClause,
      include: {
        branch: {
          select: { id: true, name: true, code: true },
        },
        items: {
          include: {
            menuItem: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
      orderBy: { saleDate: "desc" },
      take: Math.min(limit, 500),
      skip: offset,
    }),
    db.sale.count({ where: whereClause }),
  ]);

  return NextResponse.json({
    data: sales.map((sale) => ({
      id: sale.id,
      saleNumber: sale.saleNumber,
      branchId: sale.branchId,
      branchName: sale.branch?.name,
      saleDate: sale.saleDate.toISOString(),
      channel: sale.channel,
      dayPart: sale.dayPart,
      subtotal: Number(sale.subtotal),
      tax: Number(sale.tax),
      total: Number(sale.total),
      customerCount: sale.customerCount,
      items: sale.items.map((item) => ({
        menuItemId: item.menuItemId,
        menuItemName: item.menuItem?.name,
        menuItemSku: item.menuItem?.sku,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        total: Number(item.total),
      })),
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + sales.length < total,
    },
  });
}

// POST /api/v1/sales - Create a new sale
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "sales:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { branchId, channel, items, customerCount } = body;

    if (!branchId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "branchId and items are required" },
        { status: 400 }
      );
    }

    // Verify branch exists and API has access
    if (auth.branchId && auth.branchId !== branchId) {
      return NextResponse.json(
        { error: "Not authorized for this branch" },
        { status: 403 }
      );
    }

    // Generate sale number
    const saleNumber = `SALE-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // Get menu items for pricing
    const menuItemIds = items.map((i: { menuItemId: string }) => i.menuItemId);
    const menuItems = await db.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Calculate totals
    let subtotal = 0;
    const saleItems: Array<{
      menuItemId: string;
      quantity: number;
      unitPrice: number;
      unitCost: number;
      total: number;
      discount: number;
    }> = [];

    for (const item of items) {
      const menuItem = menuItemMap.get(item.menuItemId);
      if (!menuItem) {
        return NextResponse.json(
          { error: `Menu item not found: ${item.menuItemId}` },
          { status: 400 }
        );
      }

      const unitPrice = item.unitPrice || Number(menuItem.price);
      const quantity = item.quantity || 1;
      const discount = item.discount || 0;
      const itemTotal = quantity * unitPrice - discount;

      subtotal += itemTotal;
      saleItems.push({
        menuItemId: item.menuItemId,
        quantity,
        unitPrice,
        unitCost: Number(menuItem.cost),
        total: itemTotal,
        discount,
      });
    }

    const tax = subtotal * 0.125; // 12.5% VAT
    const total = subtotal + tax;

    // Determine day part
    const hour = new Date().getHours();
    let dayPart: "BREAKFAST" | "LUNCH" | "DINNER" | "LATE_NIGHT" = "LATE_NIGHT";
    if (hour >= 6 && hour < 11) dayPart = "BREAKFAST";
    else if (hour >= 11 && hour < 15) dayPart = "LUNCH";
    else if (hour >= 15 && hour < 21) dayPart = "DINNER";

    // Create sale
    const sale = await db.sale.create({
      data: {
        saleNumber,
        branchId,
        subtotal,
        tax,
        total,
        channel: channel || "API",
        dayPart,
        customerCount: customerCount || 1,
        saleDate: new Date(),
        items: {
          create: saleItems,
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      data: {
        id: sale.id,
        saleNumber: sale.saleNumber,
        branchId: sale.branchId,
        subtotal: Number(sale.subtotal),
        tax: Number(sale.tax),
        total: Number(sale.total),
        channel: sale.channel,
        saleDate: sale.saleDate.toISOString(),
        itemCount: sale.items.length,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/v1/sales] Error:", error);
    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 }
    );
  }
}
