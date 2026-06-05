/** Resolve display name for who placed an order (POS cashier, call center agent, etc.). */
export function resolveOrderPlacedByName(order: {
  cashier?: { name: string } | null;
  assignedByUser?: { name: string } | null;
}): string | null {
  return order.cashier?.name || order.assignedByUser?.name || null;
}
