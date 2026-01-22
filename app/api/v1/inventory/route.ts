import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";

// GET /api/v1/inventory - Get inventory items
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "inventory:read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId") || auth.branchId;
  const category = searchParams.get("category");
  const lowStock = searchParams.get("lowStock") === "true";
  const limit = parseInt(searchParams.get("limit") || "100");
  const offset = parseInt(searchParams.get("offset") || "0");

  const whereClause: Record<string, unknown> = {
    deletedAt: null,
    isActive: true,
  };

  if (branchId) {
    whereClause.branchId = branchId;
  }

  if (category) {
    whereClause.category = category;
  }

  const [items, total] = await Promise.all([
    db.inventoryItem.findMany({
      where: whereClause,
      include: {
        branch: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      take: Math.min(limit, 500),
      skip: offset,
    }),
    db.inventoryItem.count({ where: whereClause }),
  ]);

  // Filter for low stock if requested
  let filteredItems = items;
  if (lowStock) {
    filteredItems = items.filter(
      (item) => Number(item.currentStock) <= Number(item.reorderPoint)
    );
  }

  return NextResponse.json({
    data: filteredItems.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      unitCost: Number(item.unitCost),
      currentStock: Number(item.currentStock),
      minStock: Number(item.minStock),
      maxStock: Number(item.maxStock),
      reorderPoint: Number(item.reorderPoint),
      branchId: item.branchId,
      branchName: item.branch?.name,
      isLowStock: Number(item.currentStock) <= Number(item.reorderPoint),
      lastRestockDate: item.lastRestockDate?.toISOString() || null,
      totalValue: Number(item.currentStock) * Number(item.unitCost),
    })),
    pagination: {
      total: lowStock ? filteredItems.length : total,
      limit,
      offset,
      hasMore: offset + filteredItems.length < (lowStock ? filteredItems.length : total),
    },
  });
}

// POST /api/v1/inventory - Record stock movement
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "inventory:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { branchId, itemId, type, quantity, unitCost, reason, reference } = body;

    if (!branchId || !itemId || !type || quantity === undefined) {
      return NextResponse.json(
        { error: "branchId, itemId, type, and quantity are required" },
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

    // Verify item exists
    const item = await db.inventoryItem.findFirst({
      where: { id: itemId, branchId },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const movementTypes = ["INBOUND", "OUTBOUND_SALE", "OUTBOUND_WASTE", "OUTBOUND_TRANSFER", "ADJUSTMENT_DAMAGE", "ADJUSTMENT_LOSS"];
    if (!movementTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid movement type. Must be one of: ${movementTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Calculate stock change
    const isOutbound = type.startsWith("OUTBOUND") || type.startsWith("ADJUSTMENT");
    const stockChange = isOutbound ? -Math.abs(quantity) : Math.abs(quantity);
    const newStock = Number(item.currentStock) + stockChange;

    if (newStock < 0) {
      return NextResponse.json(
        { error: "Insufficient stock for this movement" },
        { status: 400 }
      );
    }

    // Create movement record for outbound types
    let movementId: string | null = null;
    if (type !== "INBOUND") {
      const movement = await db.outboundStock.create({
        data: {
          branchId,
          itemId,
          movementType: type as "OUTBOUND_SALE" | "OUTBOUND_WASTE" | "OUTBOUND_TRANSFER" | "ADJUSTMENT_DAMAGE" | "ADJUSTMENT_LOSS",
          quantity: Math.abs(quantity),
          reason,
          reference,
        },
      });
      movementId = movement.id;
    }

    // Update inventory stock
    await db.inventoryItem.update({
      where: { id: itemId },
      data: {
        currentStock: newStock,
        ...(type === "INBOUND" ? { lastRestockDate: new Date() } : {}),
      },
    });

    // If it's waste, create waste log
    if (type === "OUTBOUND_WASTE") {
      await db.wasteLog.create({
        data: {
          branch: { connect: { id: branchId } },
          item: { connect: { id: itemId } },
          quantity: Math.abs(quantity),
          unitCost: unitCost || item.unitCost,
          reason: reason || "API recorded waste",
          totalCost: Math.abs(quantity) * Number(item.unitCost),
          wasteDate: new Date(),
        },
      });
    }

    return NextResponse.json({
      data: {
        movementId,
        itemId,
        type,
        quantity: Math.abs(quantity),
        previousStock: Number(item.currentStock),
        newStock,
        unitCost: Number(unitCost || item.unitCost),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/v1/inventory] Error:", error);
    return NextResponse.json(
      { error: "Failed to record stock movement" },
      { status: 500 }
    );
  }
}
