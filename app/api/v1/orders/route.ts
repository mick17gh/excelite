import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";

// GET /api/v1/orders - Get POS orders
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "orders:read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId") || auth.branchId;
  const status = searchParams.get("status");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = parseInt(searchParams.get("limit") || "100");
  const offset = parseInt(searchParams.get("offset") || "0");

  const whereClause: Record<string, unknown> = {};

  if (branchId) {
    whereClause.branchId = branchId;
  }

  if (status) {
    whereClause.status = status;
  }

  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) {
      (whereClause.createdAt as Record<string, Date>).gte = new Date(startDate);
    }
    if (endDate) {
      (whereClause.createdAt as Record<string, Date>).lte = new Date(endDate);
    }
  }

  const [orders, total] = await Promise.all([
    db.posOrder.findMany({
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
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 500),
      skip: offset,
    }),
    db.posOrder.count({ where: whereClause }),
  ]);

  return NextResponse.json({
    data: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      branchId: order.branchId,
      branchName: order.branch?.name,
      orderType: order.type,
      status: order.status,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      completedAt: order.closedAt?.toISOString() || null,
      items: order.items.map((item) => ({
        menuItemId: item.menuItemId,
        menuItemName: item.menuItem?.name,
        menuItemSku: item.menuItem?.sku,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
        notes: item.notes,
      })),
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + orders.length < total,
    },
  });
}

// POST /api/v1/orders - Create a new POS order
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "orders:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { branchId, orderType, items, notes } = body;

    if (!branchId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "branchId and items are required" },
        { status: 400 }
      );
    }

    // Verify branch access
    if (auth.branchId && auth.branchId !== branchId) {
      return NextResponse.json(
        { error: "Not authorized for this branch" },
        { status: 403 }
      );
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    // Get menu items for pricing
    const menuItemIds = items.map((i: { menuItemId: string }) => i.menuItemId);
    const menuItems = await db.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Calculate totals
    let subtotal = 0;
    const orderItems: Array<{
      menuItemId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      notes?: string;
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
      const lineTotal = quantity * unitPrice;

      subtotal += lineTotal;
      orderItems.push({
        menuItemId: item.menuItemId,
        quantity,
        unitPrice,
        lineTotal,
        notes: item.notes,
      });
    }

    const tax = subtotal * 0.125; // 12.5% VAT
    const total = subtotal + tax;

    // Create order
    const order = await db.posOrder.create({
      data: {
        orderNumber,
        branchId,
        type: orderType || "DINE_IN",
        sourceChannel: "DINE_IN",
        status: "NEW",
        subtotal,
        tax,
        discount: 0,
        total,
        notes,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        branchId: order.branchId,
        orderType: order.type,
        status: order.status,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        total: Number(order.total),
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          menuItemId: item.menuItemId,
          menuItemName: item.menuItem?.name,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
        })),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/v1/orders] Error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
