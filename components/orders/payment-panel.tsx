"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Plus } from "lucide-react";
import { toast } from "sonner";
import { recordPayment, refundPayment } from "@/lib/actions/payments";
import { useCurrency } from "@/contexts/currency-context";

interface PaymentItem {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  paidAt: string | null;
}

interface PaymentPanelProps {
  orderId: string;
  orderTotal: number;
  paymentStatus: string;
  payments: PaymentItem[];
}

export function PaymentPanel({ orderId, orderTotal, paymentStatus, payments }: PaymentPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState(orderTotal);
  const [provider, setProvider] = useState("cash");
  const [providerRef, setProviderRef] = useState("");
  const { formatCurrency } = useCurrency();

  const totalPaid = Math.round(
    payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amount, 0) * 100
  ) / 100;
  const remaining = Math.round((orderTotal - totalPaid) * 100) / 100;

  const handleRecordPayment = async () => {
    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await recordPayment({
        orderId,
        amount,
        provider,
        providerRef: providerRef.trim() || undefined,
        paymentMethod: provider,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Payment recorded");
        setShowForm(false);
        setProviderRef("");
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
    else toast.success("Payment refunded");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Payments</span>
          <Badge
            variant="outline"
            className={
              paymentStatus === "PAID"
                ? "border-green-500 text-green-600"
                : paymentStatus === "REFUNDED"
                ? "border-red-500 text-red-600"
                : "border-amber-500 text-amber-600"
            }
          >
            {paymentStatus}
          </Badge>
        </div>
        {remaining > 0 && (
          <Button variant="outline" size="sm" onClick={() => { setShowForm(!showForm); setAmount(remaining); }}>
            <Plus className="mr-1 h-3 w-3" />Record Payment
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Total: <strong className="text-foreground">{formatCurrency(orderTotal)}</strong></span>
        <span>Paid: <strong className="text-green-600">{formatCurrency(totalPaid)}</strong></span>
        {remaining > 0 && <span>Remaining: <strong className="text-amber-600">{formatCurrency(remaining)}</strong></span>}
      </div>

      {/* Payment Form */}
      {showForm && (
        <div className="border rounded-md p-3 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label className="text-xs">Amount</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Method</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="momo">Mobile Money</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Reference (optional)</Label>
            <Input value={providerRef} onChange={(e) => setProviderRef(e.target.value)} placeholder="Transaction ref" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleRecordPayment} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Record
            </Button>
          </div>
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="border rounded-md divide-y">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div className="flex-1 min-w-0">
                <span className="font-mono text-xs">{p.reference}</span>
                <span className="ml-2 text-muted-foreground capitalize">{p.provider}</span>
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
