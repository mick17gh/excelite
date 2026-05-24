"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt, Printer, Download } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { format } from "date-fns";
import QRCode from "qrcode";
import {
  receiptLineAmount,
  receiptTaxLabel,
  shouldShowInclusiveFootnote,
  shouldShowTaxBreakdown,
  type ReceiptDisplayOrder,
  type ReceiptLineItem,
} from "@/lib/services/receipt-display";
import { printOrderReceipt, receiptLineLabel } from "@/lib/services/receipt-print";

type ReceiptOrderShape = Record<string, unknown> & ReceiptDisplayOrder & {
  orderNumber?: string;
  type?: string;
  paymentMethod?: string;
  customerName?: string;
  createdAt?: string;
  branch?: { name?: string; code?: string };
  items?: (ReceiptLineItem & {
    configurationLabel?: string | null;
    menuItem?: { name?: string };
  })[];
  notes?: string;
  syncPending?: boolean;
};

type StorefrontQr = { url: string } | null;

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ReceiptOrderShape;
  onClose: () => void;
  storefrontQr?: StorefrontQr;
}

function ReceiptTotalsBlock({
  order,
  formatCurrency,
}: {
  order: ReceiptOrderShape;
  formatCurrency: (amount: number) => string;
}) {
  const showBreakdown = shouldShowTaxBreakdown(order);

  return (
    <div className="space-y-1 text-xs">
      {showBreakdown ? (
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(Number(order.subtotal))}</span>
        </div>
      ) : null}
      {Number(order.discount) > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>Discount:</span>
          <span>-{formatCurrency(Number(order.discount))}</span>
        </div>
      )}
      {showBreakdown && Number(order.tax) > 0 ? (
        <div className="flex justify-between">
          <span>{receiptTaxLabel(order)}:</span>
          <span>{formatCurrency(Number(order.tax))}</span>
        </div>
      ) : null}
      {Number(order.deliveryFee) > 0 && (
        <div className="flex justify-between">
          <span>Delivery Fee:</span>
          <span>{formatCurrency(Number(order.deliveryFee))}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
        <span>TOTAL:</span>
        <span>{formatCurrency(Number(order.total))}</span>
      </div>
    </div>
  );
}

export function ReceiptModal({
  open,
  onOpenChange,
  order,
  onClose,
  storefrontQr = null,
}: ReceiptModalProps) {
  const { formatCurrency } = useCurrency();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storefrontQr?.url) {
      setQrDataUrl(null);
      return;
    }

    let cancelled = false;
    void QRCode.toDataURL(storefrontQr.url, { margin: 1, width: 80 })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [storefrontQr?.url]);

  const handlePrint = () => {
    printOrderReceipt(order, formatCurrency, {
      qrDataUrl,
      storefrontUrl: storefrontQr?.url ?? null,
    });
  };

  const handleDownload = () => {
    const receiptText = generateReceiptText(order, formatCurrency, storefrontQr?.url ?? null);
    const blob = new Blob([receiptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${order.orderNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[500px]">
        <DialogHeader className="shrink-0 space-y-1.5 px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Receipt
          </DialogTitle>
          <DialogDescription>Order #{order.orderNumber}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {order.syncPending ? (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
              This sale is queued on this device and will sync to the server when you are online. Kitchen
              tickets and inventory run after sync completes.
            </div>
          ) : null}
          <div className="rounded-lg border bg-muted/30 p-6 font-mono text-sm space-y-3">
            <div className="text-center space-y-1 border-b pb-3 mb-3">
              <h3 className="font-bold text-lg">{order.branch?.name || "Restaurant"}</h3>
              <p className="text-xs text-muted-foreground">
                {order.branch?.code || ""}
              </p>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Order #:</span>
                <span className="font-medium">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>
                  {order.createdAt
                    ? format(new Date(String(order.createdAt)), "MMM dd, yyyy HH:mm")
                    : "—"}
                </span>
              </div>
              {order.customerName && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{order.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Type:</span>
                <span>{(order.type ?? "").replace(/_/g, " ")}</span>
              </div>
              {order.paymentMethod ? (
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span>{String(order.paymentMethod).replace(/_/g, " ")}</span>
                </div>
              ) : null}
            </div>

            <div className="border-t border-b py-2 my-3">
              <div className="space-y-1">
                {order.items?.map((item, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <div className="flex-1">
                      <div className="font-medium">
                        {receiptLineLabel(item)}
                      </div>
                    </div>
                    <div className="ml-2">
                      {formatCurrency(receiptLineAmount(item))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <ReceiptTotalsBlock order={order} formatCurrency={formatCurrency} />

            {order.notes && (
              <div className="border-t pt-2 mt-3 text-xs">
                <div className="font-medium mb-1">Notes:</div>
                <div className="text-muted-foreground">{order.notes}</div>
              </div>
            )}

            {qrDataUrl && storefrontQr?.url ? (
              <div className="flex flex-col items-center gap-2 border-t pt-3 mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Order online QR code" className="h-16 w-16" />
                <p className="text-center text-xs text-muted-foreground">Scan to order online</p>
                <p className="max-w-full truncate text-center text-[10px] text-muted-foreground">
                  {storefrontQr.url}
                </p>
              </div>
            ) : null}

            {shouldShowInclusiveFootnote(order) ? (
              <p className="text-center text-[10px] text-muted-foreground">
                Prices include {order.taxName || "tax"}
              </p>
            ) : null}
            <div className="text-center text-xs text-muted-foreground border-t pt-3 mt-3">
              Thank you for your business!
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t bg-background px-6 py-4 sm:flex-row">
          <Button variant="outline" onClick={handleDownload} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" onClick={handlePrint} className="w-full sm:w-auto">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function generateReceiptText(
  order: ReceiptOrderShape,
  formatCurrency: (amount: number) => string,
  storefrontUrl: string | null
): string {
  const showBreakdown = shouldShowTaxBreakdown(order);
  const totalLines: string[] = [];

  if (showBreakdown) {
    totalLines.push(`Subtotal:${" ".repeat(25)}${formatCurrency(Number(order.subtotal))}`);
    if (Number(order.tax) > 0) {
      totalLines.push(
        `${receiptTaxLabel(order)}:${" ".repeat(Math.max(1, 38 - receiptTaxLabel(order).length))}${formatCurrency(Number(order.tax))}`
      );
    }
  }
  if (Number(order.deliveryFee) > 0) {
    totalLines.push(`Delivery Fee:${" ".repeat(21)}${formatCurrency(Number(order.deliveryFee))}`);
  }
  totalLines.push(`TOTAL:${" ".repeat(28)}${formatCurrency(Number(order.total))}`);

  const lines = [
    "=".repeat(40),
    `  ${order.branch?.name || "Restaurant"}`,
    `  ${order.branch?.code || ""}`,
    "=".repeat(40),
    `Order #: ${order.orderNumber}`,
    order.createdAt
      ? `Date: ${format(new Date(String(order.createdAt)), "MMM dd, yyyy HH:mm")}`
      : "Date: —",
    order.customerName ? `Customer: ${order.customerName}` : "",
    `Type: ${(order.type ?? "").replace(/_/g, " ")}`,
    order.paymentMethod ? `Payment: ${String(order.paymentMethod).replace(/_/g, " ")}` : "",
    "-".repeat(40),
    ...order.items?.map((item) =>
      `${receiptLineLabel(item)}${" ".repeat(20)}${formatCurrency(receiptLineAmount(item))}`
    ) || [],
    "-".repeat(40),
    ...totalLines,
    storefrontUrl ? "-".repeat(40) : "",
    storefrontUrl ? "Order online:" : "",
    storefrontUrl ?? "",
    "=".repeat(40),
    "Thank you for your business!",
    "=".repeat(40),
  ].filter(Boolean);

  return lines.join("\n");
}
