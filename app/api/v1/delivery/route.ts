import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";

// GET /api/v1/delivery - List delivery requests
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "orders:read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "100");
  const offset = parseInt(searchParams.get("offset") || "0");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [deliveries, total] = await Promise.all([
    db.deliveryRequest.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
            total: true,
            branch: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 500),
      skip: offset,
    }),
    db.deliveryRequest.count({ where }),
  ]);

  return NextResponse.json({
    data: deliveries.map((d) => ({
      id: d.id,
      orderId: d.orderId,
      orderNumber: d.order?.orderNumber,
      orderTotal: Number(d.order?.total || 0),
      branchName: d.order?.branch?.name,
      customerName: d.customerName,
      deliveryAddress: d.deliveryAddress,
      neighborhood: d.neighborhood,
      deliveryPhone: d.deliveryPhone,
      status: d.status,
      driverName: d.driverName,
      driverPhone: d.driverPhone,
      fee: Number(d.fee),
      estimatedTime: d.estimatedTime,
      createdAt: d.createdAt.toISOString(),
    })),
    pagination: { total, limit, offset, hasMore: offset + deliveries.length < total },
  });
}

// PATCH /api/v1/delivery - Update delivery status
export async function PATCH(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "orders:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, driverName, driverPhone, comments, deliveryIssues } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

    const data: Record<string, unknown> = { status };
    if (driverName) data.driverName = driverName;
    if (driverPhone) data.driverPhone = driverPhone;
    if (comments !== undefined) data.comments = comments || null;
    if (deliveryIssues) data.deliveryIssues = deliveryIssues;
    if (status === "PICKED_UP") data.actualPickupTime = new Date();
    if (status === "PICKED_UP") data.dispatchTime = new Date();
    if (status === "DELIVERED") data.actualDeliveryTime = new Date();

    const delivery = await db.deliveryRequest.update({ where: { id }, data });

    return NextResponse.json({ data: { id: delivery.id, status: delivery.status } });
  } catch (error) {
    console.error("[PATCH /api/v1/delivery] Error:", error);
    return NextResponse.json({ error: "Failed to update delivery" }, { status: 500 });
  }
}
