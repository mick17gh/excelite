import "server-only";

import { db } from "@/lib/db";

/** Remove active kitchen tickets/items when an order is cancelled or voided. */
export async function cancelKitchenTicketsForOrder(orderId: string) {
  await db.kitchenItem.updateMany({
    where: {
      ticket: { orderId },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    data: { status: "CANCELLED", completedAt: new Date() },
  });

  await db.kitchenTicket.updateMany({
    where: {
      orderId,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    data: { status: "CANCELLED", completedAt: new Date() },
  });
}
