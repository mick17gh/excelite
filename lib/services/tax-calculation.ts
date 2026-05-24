export type TaxPricingMode = "INCLUSIVE" | "EXCLUSIVE";

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface ComputeOrderTaxInput {
  /** Sum of line totals (qty × unit price) before discount */
  lineTotal: number;
  discount?: number;
  deliveryFee?: number;
  ratePercent: number;
  enabled: boolean;
  inclusive: boolean;
}

export interface ComputeOrderTaxResult {
  /** Net amount excluding tax (for reporting) */
  subtotal: number;
  tax: number;
  /** Amount customer pays */
  total: number;
  /** Line total after discount, before delivery (gross merchandise) */
  grossTotal: number;
}

/**
 * Menu prices are always customer-facing sticker prices.
 * Exclusive: tax is added on top of the taxable amount.
 * Inclusive: tax is embedded in the sticker price and extracted for receipts.
 */
export function computeOrderTaxAmounts(input: ComputeOrderTaxInput): ComputeOrderTaxResult {
  const discount = input.discount ?? 0;
  const deliveryFee = input.deliveryFee ?? 0;
  const lineTotal = roundMoney(input.lineTotal);
  const taxable = roundMoney(Math.max(0, lineTotal - discount));

  if (!input.enabled || input.ratePercent <= 0) {
    return {
      subtotal: taxable,
      tax: 0,
      total: roundMoney(taxable + deliveryFee),
      grossTotal: taxable,
    };
  }

  const rate = input.ratePercent / 100;

  if (input.inclusive) {
    const tax = roundMoney((taxable * rate) / (1 + rate));
    const subtotal = roundMoney(taxable - tax);
    return {
      subtotal,
      tax,
      total: roundMoney(taxable + deliveryFee),
      grossTotal: taxable,
    };
  }

  const subtotal = taxable;
  const tax = roundMoney(taxable * rate);
  return {
    subtotal,
    tax,
    total: roundMoney(taxable + tax + deliveryFee),
    grossTotal: taxable,
  };
}
