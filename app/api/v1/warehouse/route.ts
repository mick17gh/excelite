import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";

// GET /api/v1/warehouse - List warehouses and inventory
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "inventory:read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const warehouseId = searchParams.get("warehouseId");
  const type = searchParams.get("type") || "warehouses";

  if (type === "inventory" && warehouseId) {
    const items = await db.warehouseInventoryItem.findMany({
      where: { warehouseId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      data: items.map((item) => ({
        id: item.id,
        warehouseId: item.warehouseId,
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        unitCost: Number(item.unitCost),
        currentStock: Number(item.currentStock),
        minStock: Number(item.minStock),
        reorderPoint: Number(item.reorderPoint),
        isActive: item.isActive,
      })),
    });
  }

  if (type === "transfers") {
    const where: Record<string, unknown> = {};
    if (warehouseId) where.warehouseId = warehouseId;

    const transfers = await db.warehouseBranchTransfer.findMany({
      where,
      include: {
        warehouse: { select: { name: true } },
        warehouseItem: { select: { name: true, sku: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      data: transfers.map((t) => ({
        id: t.id,
        warehouseName: t.warehouse?.name,
        itemName: t.warehouseItem?.name,
        itemSku: t.warehouseItem?.sku,
        toBranchId: t.toBranchId,
        quantity: Number(t.quantity),
        totalCost: Number(t.totalCost),
        status: t.status,
        transferDate: t.transferDate.toISOString(),
      })),
    });
  }

  const warehouses = await db.warehouse.findMany({
    include: { _count: { select: { inventory: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    data: warehouses.map((w) => ({
      id: w.id,
      name: w.name,
      code: w.code,
      address: w.address,
      city: w.city,
      isActive: w.isActive,
      itemCount: w._count.inventory,
    })),
  });
}
