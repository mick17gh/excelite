import type { SplittablePaymentMethodCode } from "@/lib/payments/payment-methods";

export type PaymentTender = {
  method: SplittablePaymentMethodCode;
  amount: number;
  reference?: string;
  amountReceived?: number;
};

export const MAX_TENDER_LINES = 4;

const METHOD_ALIASES: Record<string, SplittablePaymentMethodCode> = {
  CASH: "CASH",
  cash: "CASH",
  CARD: "CARD",
  card: "CARD",
  MOBILE_MONEY: "MOBILE_MONEY",
  MOBILEMONEY: "MOBILE_MONEY",
  momo: "MOBILE_MONEY",
  BANK_TRANSFER: "BANK_TRANSFER",
  bank_transfer: "BANK_TRANSFER",
};

export function normalizePaymentMethod(
  method: string,
): SplittablePaymentMethodCode | null {
  const key = method.trim();
  return METHOD_ALIASES[key] ?? METHOD_ALIASES[key.toUpperCase()] ?? null;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function sumTenderAmounts(tenders: PaymentTender[]): number {
  return roundMoney(tenders.reduce((sum, t) => sum + t.amount, 0));
}

export function orderPaymentMethodFromTenders(tenders: PaymentTender[]): string {
  const methods = [...new Set(tenders.map((t) => t.method))];
  return methods.length === 1 ? methods[0] : "SPLIT";
}

export function validateTenders(
  total: number,
  tenders: PaymentTender[],
): { ok: true } | { ok: false; error: string } {
  if (!tenders.length) {
    return { ok: false, error: "Add at least one payment line" };
  }
  if (tenders.length > MAX_TENDER_LINES) {
    return { ok: false, error: `Maximum ${MAX_TENDER_LINES} payment lines allowed` };
  }

  for (const tender of tenders) {
    if (!normalizePaymentMethod(tender.method)) {
      return { ok: false, error: "Invalid payment method" };
    }
    if (tender.amount <= 0) {
      return { ok: false, error: "Each payment amount must be greater than zero" };
    }
    if (tender.method === "CASH" && tender.amountReceived != null) {
      if (roundMoney(tender.amountReceived) < roundMoney(tender.amount)) {
        return { ok: false, error: "Cash received must cover the cash portion" };
      }
    }
    if (tender.method !== "CASH" && tender.amountReceived != null) {
      return { ok: false, error: "Amount received applies to cash only" };
    }
  }

  const tenderTotal = sumTenderAmounts(tenders);
  if (Math.abs(tenderTotal - roundMoney(total)) > 0.01) {
    return {
      ok: false,
      error: `Payment lines must total ${roundMoney(total).toFixed(2)} (currently ${tenderTotal.toFixed(2)})`,
    };
  }

  return { ok: true };
}

/** Proportionally allocate session-level tenders to one order check. */
export function allocateTendersToOrder(
  orderTotal: number,
  sessionTotal: number,
  tenders: PaymentTender[],
): PaymentTender[] {
  const orderAmt = roundMoney(orderTotal);
  const sessionAmt = roundMoney(sessionTotal);
  if (orderAmt <= 0 || sessionAmt <= 0) return [];

  const ratio = orderAmt / sessionAmt;
  const allocated: PaymentTender[] = [];
  let assigned = 0;

  for (let i = 0; i < tenders.length; i++) {
    const tender = tenders[i];
    const isLast = i === tenders.length - 1;
    const amount = isLast
      ? roundMoney(orderAmt - assigned)
      : roundMoney(tender.amount * ratio);
    assigned = roundMoney(assigned + amount);

    if (amount <= 0) continue;

    allocated.push({
      method: tender.method,
      amount,
      reference: tender.reference,
      amountReceived:
        tender.method === "CASH" && tender.amountReceived != null
          ? roundMoney((amount / tender.amount) * tender.amountReceived)
          : undefined,
    });
  }

  return allocated;
}

export function cashChangeFromTenders(tenders: PaymentTender[]): number {
  return tenders.reduce((change, tender) => {
    if (tender.method !== "CASH") return change;
    const received = tender.amountReceived ?? tender.amount;
    return roundMoney(change + Math.max(0, received - tender.amount));
  }, 0);
}

export function totalCashReceived(tenders: PaymentTender[]): number {
  return tenders.reduce((sum, tender) => {
    if (tender.method !== "CASH") return sum;
    return roundMoney(sum + (tender.amountReceived ?? tender.amount));
  }, 0);
}
