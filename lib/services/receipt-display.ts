export type ReceiptLineItem = {
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
};

export type ReceiptDisplayOrder = {
  showTaxOnReceipt?: boolean;
  taxInclusive?: boolean;
  tax?: number;
  taxName?: string;
  taxRate?: number;
  subtotal?: number;
  discount?: number;
  deliveryFee?: number;
  total?: number;
  items?: ReceiptLineItem[];
};

/** When false, hide net subtotal and tax lines; line items use menu (gross) prices. */
export function shouldShowTaxBreakdown(order: ReceiptDisplayOrder): boolean {
  return order.showTaxOnReceipt !== false;
}

export function receiptLineAmount(item: ReceiptLineItem): number {
  if (item.lineTotal != null && !Number.isNaN(Number(item.lineTotal))) {
    return Number(item.lineTotal);
  }
  return Number(item.unitPrice ?? 0) * (item.quantity ?? 0);
}

export function merchandiseLinesTotal(items?: ReceiptLineItem[]): number {
  if (!items?.length) return 0;
  return items.reduce((sum, item) => sum + receiptLineAmount(item), 0);
}

export function receiptTaxLabel(order: ReceiptDisplayOrder): string {
  const name = order.taxName || "Tax";
  const rate = order.taxRate != null ? `${order.taxRate}%` : "";
  if (order.taxInclusive) {
    return rate ? `${name} included (${rate})` : `${name} included`;
  }
  return rate ? `${name} (${rate})` : name;
}

export function shouldShowInclusiveFootnote(order: ReceiptDisplayOrder): boolean {
  return (
    shouldShowTaxBreakdown(order) &&
    Boolean(order.taxInclusive) &&
    Number(order.tax) > 0
  );
}
