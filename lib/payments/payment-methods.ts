import {
  Building2,
  CreditCard,
  DollarSign,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export type SplittablePaymentMethodCode =
  | "CASH"
  | "CARD"
  | "MOBILE_MONEY"
  | "BANK_TRANSFER";

export const SPLITTABLE_PAYMENT_METHODS: Array<{
  value: SplittablePaymentMethodCode;
  label: string;
  icon: LucideIcon;
  color: string;
}> = [
  {
    value: "CASH",
    label: "Cash",
    icon: DollarSign,
    color: "bg-emerald-500/10 border-emerald-500 text-emerald-600",
  },
  {
    value: "CARD",
    label: "Card",
    icon: CreditCard,
    color: "bg-blue-500/10 border-blue-500 text-blue-600",
  },
  {
    value: "MOBILE_MONEY",
    label: "Mobile Money",
    icon: Smartphone,
    color: "bg-amber-500/10 border-amber-500 text-amber-600",
  },
  {
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
    icon: Building2,
    color: "bg-purple-500/10 border-purple-500 text-purple-600",
  },
];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MOBILE_MONEY: "Mobile Money",
  BANK_TRANSFER: "Bank Transfer",
  SPLIT: "Split payment",
  COMPLIMENTARY: "Complimentary",
  cash: "Cash",
  momo: "Mobile Money",
  card: "Card",
  bank_transfer: "Bank Transfer",
};

export function formatPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "—";
  return PAYMENT_METHOD_LABELS[method] ?? method.replace(/_/g, " ");
}

export type ReceiptPaymentLine = {
  paymentMethod?: string | null;
  amount: number;
};

export function formatReceiptPaymentHtml(
  paymentMethod: string | undefined,
  payments: ReceiptPaymentLine[] | undefined,
  formatCurrency: (amount: number) => string,
): string {
  if (payments && payments.length > 1) {
    return payments
      .map(
        (p) =>
          `<p>${formatPaymentMethodLabel(p.paymentMethod)}: ${formatCurrency(p.amount)}</p>`,
      )
      .join("");
  }
  if (payments?.length === 1) {
    return `<p>Payment: ${formatPaymentMethodLabel(payments[0].paymentMethod)} — ${formatCurrency(payments[0].amount)}</p>`;
  }
  if (paymentMethod) {
    return `<p>Payment: ${formatPaymentMethodLabel(paymentMethod)}</p>`;
  }
  return "";
}
