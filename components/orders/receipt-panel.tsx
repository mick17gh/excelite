"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { generateReceipt } from "@/lib/actions/receipts";
import { useCurrency } from "@/contexts/currency-context";
import {
  receiptTaxLabel,
  receiptTaxNumberLine,
  shouldShowInclusiveFootnote,
  shouldShowTaxBreakdown,
  type ReceiptDisplayOrder,
} from "@/lib/services/receipt-display";
import { printOrderReceipt } from "@/lib/services/receipt-print";

interface ReceiptData {
  id: string;
  orderId: string;
  receiptNumber: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  items: { name: string; sku: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  tax: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  pdfUrl: string | null;
  sentVia: string[];
  createdAt: string;
}

interface ReceiptPanelProps {
  orderId: string;
  orderNumber: string;
  branchName: string;
  branchCode?: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  paymentMethod: string | null;
  receipt: ReceiptData | null;
  taxInclusive?: boolean;
  showTaxOnReceipt?: boolean;
  taxNumber?: string | null;
  showTaxNumberOnReceipt?: boolean;
  taxName?: string;
  taxRate?: number;
}

export function ReceiptPanel({
  orderId,
  orderNumber,
  branchName,
  branchCode = "",
  customerName,
  customerPhone,
  customerEmail,
  paymentMethod,
  receipt,
  taxInclusive = false,
  showTaxOnReceipt = true,
  taxNumber = null,
  showTaxNumberOnReceipt = false,
  taxName = "VAT",
  taxRate,
}: ReceiptPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData | null>(receipt);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    setCurrentReceipt(receipt);
  }, [receipt]);

  const displayOrder: ReceiptDisplayOrder = {
    showTaxOnReceipt,
    taxInclusive,
    taxName,
    taxRate,
    taxNumber,
    showTaxNumberOnReceipt,
    subtotal: currentReceipt?.subtotal,
    tax: currentReceipt?.tax,
    discount: currentReceipt?.discount,
    deliveryFee: currentReceipt?.deliveryFee,
    total: currentReceipt?.total,
  };
  const showBreakdown = shouldShowTaxBreakdown(displayOrder);
  const taxNumberLine = receiptTaxNumberLine(displayOrder);

  const handlePrint = () => {
    if (!currentReceipt) return;
    printOrderReceipt(
      {
        orderNumber,
        branchName,
        branchCode,
        taxNumber,
        showTaxNumberOnReceipt,
        createdAt: currentReceipt.createdAt,
        customerName: currentReceipt.customerName,
        paymentMethod: currentReceipt.paymentMethod,
        items: currentReceipt.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
        ...displayOrder,
      },
      formatCurrency
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateReceipt({
        orderId,
        customerName: customerName || "Walk-in Customer",
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        paymentMethod: paymentMethod || "cash",
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Receipt generated");
        setCurrentReceipt(result.data as ReceiptData);
      }
    } catch {
      toast.error("Failed to generate receipt");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Receipt</span>
        </div>
        {!currentReceipt && (
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <FileText className="mr-1 h-3 w-3" />}
            Generate Receipt
          </Button>
        )}
      </div>

      {currentReceipt ? (
        <div className="border rounded-md p-3 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-medium">{currentReceipt.receiptNumber}</span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrint}
                title="Print receipt"
                aria-label="Print receipt"
              >
                <Printer className="h-4 w-4" />
              </Button>
              <Badge variant="secondary" className="text-xs">Generated</Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-0.5 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{branchName}</p>
            {branchCode ? <p>{branchCode}</p> : null}
            {taxNumberLine ? <p>{taxNumberLine}</p> : null}
          </div>

          <div className="space-y-1">
            <p className="font-medium">{currentReceipt.customerName}</p>
            {currentReceipt.customerPhone && <p className="text-xs text-muted-foreground">{currentReceipt.customerPhone}</p>}
          </div>

          <div className="space-y-1">
            {currentReceipt.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span>{item.name} x{item.quantity}</span>
                <span>{formatCurrency(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-1 text-xs">
            {showBreakdown ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(currentReceipt.subtotal)}</span>
              </div>
            ) : null}
            {showBreakdown && currentReceipt.tax > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{receiptTaxLabel(displayOrder)}</span>
                <span>{formatCurrency(currentReceipt.tax)}</span>
              </div>
            ) : null}
            {currentReceipt.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-red-500">-{formatCurrency(currentReceipt.discount)}</span>
              </div>
            )}
            {currentReceipt.deliveryFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span>{formatCurrency(currentReceipt.deliveryFee)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{formatCurrency(currentReceipt.total)}</span>
            </div>
          </div>

          {shouldShowInclusiveFootnote(displayOrder) ? (
            <p className="text-[10px] text-muted-foreground text-center">
              Prices include {taxName}
            </p>
          ) : null}

          <div className="flex justify-between text-xs text-muted-foreground pt-1">
            <span>Payment: {currentReceipt.paymentMethod}</span>
            <span>{new Date(currentReceipt.createdAt).toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">No receipt generated yet</p>
      )}
    </div>
  );
}
