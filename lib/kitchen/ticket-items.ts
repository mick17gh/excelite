import { db } from "@/lib/db";
import { filterOrderItemsForKitchenStation } from "@/lib/kitchen/category-routing";

const orderItemsWithCategoryInclude = {
  items: {
    include: {
      menuItem: { include: { category: { select: { name: true } } } },
    },
  },
} as const;

export async function getKitchenEligibleOrderItems(orderId: string, stationId: string) {
  const [order, station] = await Promise.all([
    db.order.findUnique({
      where: { id: orderId },
      include: orderItemsWithCategoryInclude,
    }),
    db.kitchenStation.findUnique({
      where: { id: stationId },
      select: { id: true, branchId: true, categories: true },
    }),
  ]);

  if (!order) {
    return { ok: false as const, error: "Order not found" };
  }
  if (!station) {
    return { ok: false as const, error: "Kitchen station not found" };
  }
  if (station.branchId !== order.branchId) {
    return { ok: false as const, error: "Kitchen station does not belong to this order's branch" };
  }

  const items = filterOrderItemsForKitchenStation(order.items, station.categories);
  if (items.length === 0) {
    return {
      ok: false as const,
      error: "No order items match this station's menu categories",
    };
  }

  return { ok: true as const, items, station };
}
