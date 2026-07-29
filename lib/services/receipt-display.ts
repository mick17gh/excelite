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
  taxNumber?: string | null;
  showTaxNumberOnReceipt?: boolean;
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

/** Show TIN / VAT ID under branch name when toggle is on and a number is set. */
export function receiptTaxNumberLine(order: {
  taxNumber?: string | null;
  showTaxNumberOnReceipt?: boolean;
  branch?: { taxNumber?: string | null; showTaxNumberOnReceipt?: boolean } | null;
}): string | null {
  const show =
    order.showTaxNumberOnReceipt ?? order.branch?.showTaxNumberOnReceipt ?? false;
  const number = (order.taxNumber ?? order.branch?.taxNumber ?? "").trim();
  if (!show || !number) return null;
  return `TIN: ${number}`;
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
