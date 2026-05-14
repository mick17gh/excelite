import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";
import { createOrder } from "@/lib/actions/orders";

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
    db.order.findMany({
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
            selections: { select: { menuItemOptionId: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 500),
      skip: offset,
    }),
    db.order.count({ where: whereClause }),
  ]);

  return NextResponse.json({
    data: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      branchId: order.branchId,
      branchName: order.branch?.name,
      source: order.source,
      orderType: order.type,
      status: order.status,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      discount: Number(order.discount),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      paymentStatus: order.paymentStatus,
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
        configurationLabel: item.configurationLabel,
        configurationKey: item.configurationKey,
        menuItemOptionIds: item.selections?.map((s) => s.menuItemOptionId) ?? [],
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

    const orderResult = await createOrder({
      branchId,
      source: "POS",
      type: orderType || "DINE_IN",
      items: items.map(
        (i: {
          menuItemId: string;
          quantity?: number;
          notes?: string;
          menuItemOptionIds?: string[];
        }) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity || 1,
          notes: i.notes,
          menuItemOptionIds: i.menuItemOptionIds,
        })
      ),
      notes,
    });

    if (orderResult.error || !orderResult.data) {
      return NextResponse.json(
        { error: orderResult.error || "Failed to create order" },
        { status: 400 }
      );
    }

    const o = orderResult.data;
    return NextResponse.json(
      {
        data: {
          id: o.id,
          orderNumber: o.orderNumber,
          branchId: o.branchId,
          orderType: o.type,
          status: o.status,
          subtotal: o.subtotal,
          tax: o.tax,
          total: o.total,
          createdAt: o.createdAt,
          items: o.items.map(
            (item: {
              menuItemId: string;
              quantity: number;
              unitPrice: number;
              lineTotal: number;
              notes?: string | null;
              configurationLabel?: string | null;
              configurationKey?: string | null;
              menuItemOptionIds?: string[];
            }) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              notes: item.notes,
              configurationLabel: item.configurationLabel,
              configurationKey: item.configurationKey,
              menuItemOptionIds: item.menuItemOptionIds ?? [],
            })
          ),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/v1/orders] Error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
