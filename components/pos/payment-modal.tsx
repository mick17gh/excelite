"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CreditCard, DollarSign, Smartphone, Building2, Loader2, Check, User, FileText } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { cn } from "@/lib/utils";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  subtotal?: number;
  tax?: number;
  onComplete: (paymentData: PaymentData) => void;
  isProcessing?: boolean;
}

export interface PaymentData {
  paymentMethod: string;
  amountPaid: number;
  change: number;
  customerName?: string;
  notes?: string;
}

const paymentMethods = [
  { value: "CASH", label: "Cash", icon: DollarSign, color: "bg-emerald-500/10 border-emerald-500 text-emerald-600" },
  { value: "CARD", label: "Card", icon: CreditCard, color: "bg-blue-500/10 border-blue-500 text-blue-600" },
  { value: "MOBILE_MONEY", label: "Mobile Money", icon: Smartphone, color: "bg-amber-500/10 border-amber-500 text-amber-600" },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Building2, color: "bg-purple-500/10 border-purple-500 text-purple-600" },
];

const quickAmounts = [50, 100, 200, 500];

export function PaymentModal({
  open,
  onOpenChange,
  total,
  subtotal,
  tax,
  onComplete,
  isProcessing = false,
}: PaymentModalProps) {
  const { formatCurrency } = useCurrency();
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");

  // Reset amount when modal opens or payment method changes
  useEffect(() => {
    if (open) {
      setAmountPaid(paymentMethod === "CASH" ? "" : total.toFixed(2));
    }
  }, [open, paymentMethod, total]);

  const amountPaidNum = parseFloat(amountPaid) || 0;
  const change = amountPaidNum - total;
  const isValidPayment = paymentMethod === "CASH" ? amountPaidNum >= total : true;

  const handleComplete = () => {
    if (!isValidPayment) return;

    onComplete({
      paymentMethod,
      amountPaid: paymentMethod === "CASH" ? amountPaidNum : total,
      change: paymentMethod === "CASH" ? Math.max(0, change) : 0,
      customerName: customerName.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const handleQuickAmount = (amount: number) => {
    const newAmount = (amountPaidNum || 0) + amount;
    setAmountPaid(newAmount.toFixed(2));
  };

  const handleExactAmount = () => {
    setAmountPaid(total.toFixed(2));
  };

  const displaySubtotal = subtotal ?? total / 1.125;
  const displayTax = tax ?? total - displaySubtotal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-xl">Complete Payment</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Order Summary */}
            <div className="rounded-xl bg-muted/50 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(displaySubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT (12.5%)</span>
                <span>{formatCurrency(displayTax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold text-lg">Total</span>
                <span className="font-bold text-xl text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                        isSelected
                          ? method.color
                          : "border-border hover:border-muted-foreground/30"
                      )}
                      onClick={() => setPaymentMethod(method.value)}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        isSelected ? "bg-current/10" : "bg-muted"
                      )}>
                        <Icon className={cn("h-5 w-5", isSelected ? "" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{method.label}</p>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Amount Input */}
            {paymentMethod === "CASH" && (
              <div className="space-y-3">
                <Label htmlFor="amountPaid" className="text-sm font-medium">
                  Amount Received
                </Label>
                <Input
                  id="amountPaid"
                  type="number"
                  step="0.01"
                  min={0}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={`Enter amount (min: ${formatCurrency(total)})`}
                  className="h-12 text-lg font-semibold"
                />
                
                {/* Quick Amounts */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExactAmount}
                    className="h-9"
                  >
                    Exact ({formatCurrency(total)})
                  </Button>
                  {quickAmounts.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAmount(amount)}
                      className="h-9"
                    >
                      +{formatCurrency(amount)}
                    </Button>
                  ))}
                </div>

                {/* Change Display */}
                {amountPaidNum > 0 && (
                  <div className={cn(
                    "rounded-lg p-3 text-center",
                    change >= 0 ? "bg-emerald-500/10" : "bg-destructive/10"
                  )}>
                    {change >= 0 ? (
                      <p className="text-emerald-600 font-semibold">
                        Change: {formatCurrency(change)}
                      </p>
                    ) : (
                      <p className="text-destructive font-semibold">
                        Short: {formatCurrency(Math.abs(change))}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="customerName" className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Customer Name
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="customerName"
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Notes
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 pt-4 border-t shrink-0 flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="flex-1 h-12"
          >
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isProcessing || !isValidPayment}
            className="flex-2 h-12 text-base font-semibold"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                Complete Payment
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
