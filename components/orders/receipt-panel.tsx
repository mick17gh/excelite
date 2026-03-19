"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { generateReceipt } from "@/lib/actions/receipts";
import { useCurrency } from "@/contexts/currency-context";

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
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  paymentMethod: string | null;
  receipt: ReceiptData | null;
}

export function ReceiptPanel({ orderId, customerName, customerPhone, customerEmail, paymentMethod, receipt }: ReceiptPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData | null>(receipt);
  const { formatCurrency } = useCurrency();

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
        setCurrentReceipt(result.data as any);
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
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-medium">{currentReceipt.receiptNumber}</span>
            <Badge variant="secondary" className="text-xs">Generated</Badge>
          </div>

          <Separator />

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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(currentReceipt.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(currentReceipt.tax)}</span>
            </div>
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
