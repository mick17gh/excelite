export type WhatsAppOrderLine = {
  quantity: number;
  name: string;
  optionsLabel?: string | null;
  lineTotal: number;
};

export type WhatsAppOrderMessageInput = {
  storeName: string;
  orderType: "Pickup" | "Delivery";
  branchName: string;
  items: WhatsAppOrderLine[];
  itemsTotal: number;
  taxIncludedAmount?: number | null;
  amount: number;
  currency: string;
  customerName: string;
  customerPhone: string;
};

function money(currency: string, value: number): string {
  return `${currency} ${value.toFixed(2)}`;
}

/** Builds the WhatsApp cart handoff message (no Excelite order). */
export function buildWhatsAppOrderMessage(input: WhatsAppOrderMessageInput): string {
  const lines = [
    `New order — ${input.storeName}`,
    "",
    `Type: ${input.orderType}`,
    `Branch: ${input.branchName}`,
    "",
    "Items",
    ...input.items.map((item) => {
      const opt = item.optionsLabel?.trim() ? ` (${item.optionsLabel.trim()})` : "";
      return `• ${item.quantity}× ${item.name}${opt} — ${money(input.currency, item.lineTotal)}`;
    }),
    "",
    `Items total: ${money(input.currency, input.itemsTotal)}`,
  ];

  if (input.taxIncludedAmount != null && input.taxIncludedAmount > 0) {
    lines.push(`Tax included: ${money(input.currency, input.taxIncludedAmount)}`);
  }

  lines.push(
    `Amount: ${money(input.currency, input.amount)}`,
    "",
    "Customer",
    `Name: ${input.customerName}`,
    `Phone: ${input.customerPhone}`,
  );

  return lines.join("\n");
}

export function normalizeWhatsAppDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function buildWhatsAppOrderUrl(whatsappNumber: string, message: string): string | null {
  const digits = normalizeWhatsAppDigits(whatsappNumber);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
