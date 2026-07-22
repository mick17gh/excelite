"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { paymentStatusBadgeClass, orderSectionCardClass } from "@/components/orders/order-styles";
import { Loader2, CreditCard, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  recordSplitPayment,
  refundPayment,
  initializePaystackOrderPayment,
} from "@/lib/actions/payments";
import { SplitPaymentForm } from "@/components/payments/split-payment-form";
import { formatPaymentMethodLabel } from "@/lib/payments/payment-methods";
import type { PaymentTender } from "@/lib/payments/tenders";
import { useCurrency } from "@/contexts/currency-context";

interface PaymentItem {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  paymentMethod?: string | null;
  paidAt: string | null;
}

interface PaymentPanelProps {
  orderId: string;
  orderNumber: string;
  orderTotal: number;
  paymentStatus: string;
  paystackEnabled?: boolean;
  customerPhone?: string | null;
  customerEmail?: string | null;
  payments: PaymentItem[];
  /** Called after a payment is recorded or refunded so the parent can refresh order data */
  onRefresh?: () => void | Promise<void>;
}

export function PaymentPanel({
  orderId,
  orderNumber,
  orderTotal,
  paymentStatus,
  paystackEnabled = false,
  customerPhone,
  customerEmail,
  payments,
  onRefresh,
}: PaymentPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaystackInitializing, setIsPaystackInitializing] = useState(false);
  const { formatCurrency } = useCurrency();

  const totalPaid = Math.round(
    payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amount, 0) * 100
  ) / 100;
  const remaining = Math.round((orderTotal - totalPaid) * 100) / 100;

  const handleRecordSplitPayment = async (tenders: PaymentTender[]) => {
    setIsSubmitting(true);
    try {
      const result = await recordSplitPayment({ orderId, tenders });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Payment recorded");
        setShowForm(false);
        await onRefresh?.();
      }
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefund = async (paymentId: string) => {
    const result = await refundPayment(paymentId);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Payment refunded");
      await onRefresh?.();
    }
  };

  const handlePaystackPayment = async () => {
    setIsPaystackInitializing(true);
    try {
      const fallbackEmail = customerPhone
        ? `${customerPhone.replace(/\D/g, "") || "guest"}@excelite.app`
        : `${orderNumber.toLowerCase().replace(/[^a-z0-9]/g, "") || "guest"}@excelite.app`;
      const email = customerEmail || fallbackEmail;
      const callback = new URL(window.location.href);
      callback.searchParams.set("paystackCallback", "1");
      callback.searchParams.set("orderId", orderId);

      const result = await initializePaystackOrderPayment({
        orderId,
        email,
        callbackUrl: callback.toString(),
      });
      if (result.error || !result.data?.authorizationUrl) {
        toast.error(result.details ? `${result.error}: ${result.details}` : (result.error || "Failed to initialize Paystack"));
        return;
      }

      // Redirect to Paystack-hosted checkout page (no embedded popup).
      window.location.assign(result.data.authorizationUrl);
    } catch {
      toast.error("Failed to start Paystack payment");
    } finally {
      setIsPaystackInitializing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-[#16A34A]" />
          <span className="text-sm font-medium text-[#222831]">Payments</span>
          <Badge variant="outline" className={paymentStatusBadgeClass(paymentStatus)}>
            {paymentStatus}
          </Badge>
        </div>
        {remaining > 0 && (
          <div className="flex items-center gap-2">
            {paystackEnabled && (
              <Button
                size="sm"
                onClick={handlePaystackPayment}
                disabled={isPaystackInitializing}
                className="rounded-lg bg-[#22C55E] hover:bg-[#16A34A]"
              >
                {isPaystackInitializing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CreditCard className="mr-1 h-3 w-3" />}
                Pay with Paystack
              </Button>
            )}
            <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setShowForm(!showForm)}>
              <Plus className="mr-1 h-3 w-3" />Record Payment
            </Button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Total: <strong className="text-[#222831]">{formatCurrency(orderTotal)}</strong></span>
        <span>Paid: <strong className="text-[#16A34A]">{formatCurrency(totalPaid)}</strong></span>
        {remaining > 0 && (
          <span>Remaining: <strong className="text-amber-600">{formatCurrency(remaining)}</strong></span>
        )}
      </div>

      {showForm && (
        <div className={orderSectionCardClass}>
          <SplitPaymentForm
            total={remaining}
            disabled={isSubmitting}
            submitLabel={isSubmitting ? "Recording..." : "Record payment"}
            onSubmit={handleRecordSplitPayment}
          />
          <div className="flex justify-end mt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="rounded-xl border border-border divide-y overflow-hidden">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div className="flex-1 min-w-0">
                <span className="font-mono text-xs">{p.reference}</span>
                <span className="ml-2 text-muted-foreground">
                  {formatPaymentMethodLabel(p.paymentMethod || p.provider)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{p.status}</Badge>
                <span className="font-medium">{formatCurrency(p.amount)}</span>
                {p.status === "PAID" && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-red-500 hover:text-red-600" onClick={() => handleRefund(p.id)}>
                    Refund
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
