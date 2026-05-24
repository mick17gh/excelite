import { format } from "date-fns";
import {
  receiptLineAmount,
  receiptTaxLabel,
  shouldShowInclusiveFootnote,
  shouldShowTaxBreakdown,
  type ReceiptDisplayOrder,
  type ReceiptLineItem,
} from "@/lib/services/receipt-display";

export type PrintableReceiptItem = ReceiptLineItem & {
  name?: string;
  configurationLabel?: string | null;
  menuItem?: { name?: string };
};

export type PrintableReceiptOrder = ReceiptDisplayOrder & {
  orderNumber?: string;
  createdAt?: string;
  customerName?: string;
  paymentMethod?: string;
  type?: string;
  branch?: { name?: string; code?: string };
  branchName?: string;
  branchCode?: string;
  items?: PrintableReceiptItem[];
};

export function receiptLineLabel(item: PrintableReceiptItem): string {
  const qty = item.quantity ?? 0;
  const base = item.menuItem?.name || item.name || "Item";
  const suffix = item.configurationLabel ? ` (${item.configurationLabel})` : "";
  return `${qty}x ${base}${suffix}`;
}

function branchTitle(order: PrintableReceiptOrder): string {
  return order.branch?.name || order.branchName || "Restaurant";
}

function branchCode(order: PrintableReceiptOrder): string {
  return order.branch?.code || order.branchCode || "";
}

function receiptTotalsHtml(
  order: PrintableReceiptOrder,
  formatCurrency: (amount: number) => string
): string {
  const showBreakdown = shouldShowTaxBreakdown(order);
  const parts: string[] = [];

  if (showBreakdown) {
    parts.push(`
    <div class="item">
      <span>Subtotal:</span>
      <span>${formatCurrency(Number(order.subtotal))}</span>
    </div>`);
  }
  if (Number(order.discount) > 0) {
    parts.push(`
    <div class="item">
      <span>Discount:</span>
      <span>-${formatCurrency(Number(order.discount))}</span>
    </div>`);
  }
  if (Number(order.tax) > 0 && showBreakdown) {
    parts.push(`
    <div class="item">
      <span>${receiptTaxLabel(order)}:</span>
      <span>${formatCurrency(Number(order.tax))}</span>
    </div>`);
  }
  if (shouldShowInclusiveFootnote(order)) {
    parts.push(`<p style="text-align:center;font-size:10px;">Prices include ${order.taxName || "tax"}</p>`);
  }
  if (Number(order.deliveryFee) > 0) {
    parts.push(`
    <div class="item">
      <span>Delivery Fee:</span>
      <span>${formatCurrency(Number(order.deliveryFee))}</span>
    </div>`);
  }
  parts.push(`
    <div class="item">
      <span>TOTAL:</span>
      <span>${formatCurrency(Number(order.total))}</span>
    </div>`);

  return parts.join("");
}

export function buildReceiptPrintHtml(
  order: PrintableReceiptOrder,
  formatCurrency: (amount: number) => string,
  options?: { qrDataUrl?: string | null; storefrontUrl?: string | null }
): string {
  const qrBlock =
    options?.qrDataUrl && options?.storefrontUrl
      ? `
  <div style="text-align:center;margin-top:16px;padding-top:12px;border-top:1px solid #000;">
    <img src="${options.qrDataUrl}" alt="Order online" width="70" height="70" />
    <p style="font-size:10px;margin:8px 0 4px;">Scan to order online</p>
    <p style="font-size:9px;word-break:break-all;">${options.storefrontUrl}</p>
  </div>`
      : "";

  const paymentLine = order.paymentMethod
    ? `<p>Payment: ${String(order.paymentMethod).replace(/_/g, " ")}</p>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Receipt - ${order.orderNumber ?? ""}</title>
  <style>
    body { font-family: monospace; font-size: 12px; padding: 20px; max-width: 300px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
    .item { display: flex; justify-content: space-between; margin: 5px 0; }
    .total { border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; font-weight: bold; }
    .footer { text-align: center; margin-top: 20px; font-size: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>${branchTitle(order)}</h2>
    ${branchCode(order) ? `<p>${branchCode(order)}</p>` : ""}
    <p>Order #${order.orderNumber ?? "—"}</p>
    <p>${order.createdAt ? format(new Date(String(order.createdAt)), "MMM dd, yyyy HH:mm") : "—"}</p>
    ${order.customerName ? `<p>${order.customerName}</p>` : ""}
    ${paymentLine}
  </div>
  ${order.items?.map((item) => `
    <div class="item">
      <span>${receiptLineLabel(item)}</span>
      <span>${formatCurrency(receiptLineAmount(item))}</span>
    </div>
  `).join("") ?? ""}
  <div class="total">
    ${receiptTotalsHtml(order, formatCurrency)}
  </div>
  ${qrBlock}
  <div class="footer">Thank you for your business!</div>
</body>
</html>
  `;
}

export function printOrderReceipt(
  order: PrintableReceiptOrder,
  formatCurrency: (amount: number) => string,
  options?: { qrDataUrl?: string | null; storefrontUrl?: string | null }
): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const receiptHtml = buildReceiptPrintHtml(order, formatCurrency, options);
  printWindow.document.write(receiptHtml);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
