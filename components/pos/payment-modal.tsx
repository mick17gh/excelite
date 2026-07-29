"use client";

import { useState, useEffect, useRef } from "react";
import type { SplitPaymentFormHandle } from "@/components/payments/split-payment-form";
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
import { Loader2, Check, User, FileText, MapPin, WifiOff } from "lucide-react";
import { SplitPaymentForm } from "@/components/payments/split-payment-form";
import {
  cashChangeFromTenders,
  totalCashReceived,
  orderPaymentMethodFromTenders,
  type PaymentTender,
} from "@/lib/payments/tenders";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CustomerPicker,
  WALK_IN_CUSTOMER_VALUE,
  type CustomerPickerOption,
} from "@/components/customers/customer-picker";
import { useCurrency } from "@/contexts/currency-context";
import { cn } from "@/lib/utils";
import { posOrderTypes } from "@/components/pos/pos-theme";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  subtotal?: number;
  tax?: number;
  taxName?: string;
  taxRate?: number;
  taxInclusive?: boolean;
  taxEnabled?: boolean;
  lineTotal?: number;
  onComplete: (paymentData: PaymentData) => void;
  isProcessing?: boolean;
  customers?: CustomerPickerOption[];
  orderType?: string;
  onOrderTypeChange?: (type: string) => void;
  offlineRestricted?: boolean;
  allowComplimentary?: boolean;
  onCustomerCreated?: (customer: CustomerPickerOption) => void;
}

export interface PaymentData {
  paymentMethod: string;
  tenders?: PaymentTender[];
  amountPaid: number;
  change: number;
  customerId?: string;
  customerName?: string;
  orderType: string;
  notes?: string;
  complimentaryReason?: string;
  deliveryAddress?: string;
  deliveryPhone?: string;
  deliveryNotes?: string;
  deliveryFee?: number;
}

export function PaymentModal({
  open,
  onOpenChange,
  total: totalProp,
  subtotal,
  tax,
  taxName = "VAT",
  taxRate = 12.5,
  taxInclusive = false,
  taxEnabled = true,
  lineTotal,
  onComplete,
  isProcessing = false,
  customers = [],
  orderType: initialOrderType = "DINE_IN",
  onOrderTypeChange,
  offlineRestricted = false,
  allowComplimentary = false,
  onCustomerCreated,
}: PaymentModalProps) {
  const { formatCurrency } = useCurrency();
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [localOrderType, setLocalOrderType] = useState(initialOrderType);
  const [notes, setNotes] = useState("");
  const [complimentaryReason, setComplimentaryReason] = useState("");

  const [customerId, setCustomerId] = useState<string>(WALK_IN_CUSTOMER_VALUE);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerPickerOption | null>(null);
  const wasOpenRef = useRef(false);
  const splitPaymentRef = useRef<SplitPaymentFormHandle>(null);
  const [canCompletePayment, setCanCompletePayment] = useState(false);
  const [paymentSubmitLabel, setPaymentSubmitLabel] = useState("Complete Payment");

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryFeeStr, setDeliveryFeeStr] = useState("");
  const deliveryFee = parseFloat(deliveryFeeStr) || 0;
  const isDelivery = localOrderType === "DELIVERY" && !offlineRestricted;
  const total = Math.round((isDelivery ? totalProp + deliveryFee : totalProp) * 100) / 100;

  const orderTypeOptionsFiltered = offlineRestricted
    ? posOrderTypes.filter((o) => o.value !== "DELIVERY")
    : posOrderTypes;

  const handleOrderTypeChange = (type: string) => {
    setLocalOrderType(type);
    onOrderTypeChange?.(type);
  };

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;

    if (justOpened) {
      setCanCompletePayment(false);
      setPaymentSubmitLabel("Complete Payment");
      setPaymentMethod("CASH");
      setCustomerId(WALK_IN_CUSTOMER_VALUE);
      setSelectedCustomer(null);
      setNotes("");
      setDeliveryAddress("");
      setDeliveryPhone("");
      setDeliveryNotes("");
      setDeliveryFeeStr("");
      setComplimentaryReason("");
    }

    const nextType =
      offlineRestricted && initialOrderType === "DELIVERY" ? "DINE_IN" : initialOrderType;
    setLocalOrderType(nextType);
    if (justOpened && offlineRestricted && initialOrderType === "DELIVERY") {
      onOrderTypeChange?.("DINE_IN");
    }
  }, [open, offlineRestricted, initialOrderType, onOrderTypeChange]);

  const isValidComplimentary =
    paymentMethod === "COMPLIMENTARY" && complimentaryReason.trim().length > 0;

  const buildPaymentPayload = (tenders?: PaymentTender[]) => {
    const method = tenders ? orderPaymentMethodFromTenders(tenders) : paymentMethod;
    const amountPaid = tenders ? totalCashReceived(tenders) : 0;
    const change = tenders ? cashChangeFromTenders(tenders) : 0;

    return {
      paymentMethod: method,
      tenders,
      amountPaid,
      change,
      customerId:
        customerId !== WALK_IN_CUSTOMER_VALUE ? customerId : undefined,
      customerName: selectedCustomer?.name || undefined,
      orderType: localOrderType,
      notes: notes.trim() || undefined,
      complimentaryReason:
        method === "COMPLIMENTARY" ? complimentaryReason.trim() : undefined,
      deliveryAddress: isDelivery ? deliveryAddress.trim() || undefined : undefined,
      deliveryPhone: isDelivery ? deliveryPhone.trim() || undefined : undefined,
      deliveryNotes: isDelivery ? deliveryNotes.trim() || undefined : undefined,
      deliveryFee: isDelivery && deliveryFee > 0 ? deliveryFee : undefined,
    };
  };

  const handleSplitPayment = (tenders: PaymentTender[]) => {
    if (offlineRestricted && (tenders.length > 1 || tenders.some((t) => t.method !== "CASH"))) {
      return;
    }
    setPaymentMethod(orderPaymentMethodFromTenders(tenders));
    onComplete(buildPaymentPayload(tenders));
  };

  const handleComplimentaryComplete = () => {
    if (!isValidComplimentary) return;
    onComplete(buildPaymentPayload());
  };

  const displayTax = tax ?? 0;
  const displaySubtotal = subtotal ?? (lineTotal != null ? lineTotal - (taxInclusive ? displayTax : 0) : total - displayTax);
  const merchandiseTotal = lineTotal ?? (taxInclusive ? totalProp : totalProp);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 max-h-[90vh] flex flex-col rounded-2xl overflow-hidden">
        <DialogHeader className="px-6 py-4 excelite-header-gradient text-white shrink-0 border-b border-white/10">
          <DialogTitle className="text-lg font-semibold">Complete payment</DialogTitle>
          <p className="text-sm text-white/60 font-normal">Review total and take payment</p>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {offlineRestricted ? (
              <Alert className="border-amber-500/40 bg-amber-500/8 rounded-xl">
                <WifiOff className="text-amber-700" />
                <AlertDescription className="text-amber-900 dark:text-amber-200 text-sm">
                  Offline checkout: cash only. Orders sync when you reconnect.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className={cn("grid gap-2", offlineRestricted ? "grid-cols-2" : "grid-cols-3")}>
              {orderTypeOptionsFiltered.map((opt) => {
                const Icon = opt.icon;
                const isActive = localOrderType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
                      isActive ? opt.chipClass : "border-border hover:border-[#22C55E]/30 bg-background",
                    )}
                    onClick={() => handleOrderTypeChange(opt.value)}
                  >
                    <Icon className={cn("h-5 w-5", isActive ? "text-[#16A34A]" : "text-muted-foreground")} />
                    <span className={cn("text-xs font-medium", !isActive && "text-muted-foreground")}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              {taxInclusive && taxEnabled ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items total</span>
                    <span>{formatCurrency(merchandiseTotal)}</span>
                  </div>
                  {displayTax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {taxName} included ({taxRate}%)
                      </span>
                      <span>{formatCurrency(displayTax)}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(displaySubtotal)}</span>
                  </div>
                  {taxEnabled && displayTax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {taxName} ({taxRate}%)
                      </span>
                      <span>{formatCurrency(displayTax)}</span>
                    </div>
                  )}
                </>
              )}
              {isDelivery && deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery fee</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-[#222831]">Total due</span>
                <span className="font-bold text-2xl text-[#16A34A]">{formatCurrency(total)}</span>
              </div>
            </div>

            {allowComplimentary && !offlineRestricted && (
              <div className="space-y-3">
                <Button
                  type="button"
                  variant={paymentMethod === "COMPLIMENTARY" ? "default" : "outline"}
                  className={cn(
                    "w-full rounded-xl",
                    paymentMethod === "COMPLIMENTARY" && "excelite-header-gradient hover:opacity-90 text-white",
                  )}
                  onClick={() =>
                    setPaymentMethod((m) => (m === "COMPLIMENTARY" ? "CASH" : "COMPLIMENTARY"))
                  }
                >
                  Complimentary order
                </Button>
                {paymentMethod === "COMPLIMENTARY" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Authorization reason *</Label>
                    <Textarea
                      value={complimentaryReason}
                      onChange={(e) => setComplimentaryReason(e.target.value)}
                      placeholder="e.g. staff meal, VIP guest"
                      rows={2}
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-[#16A34A]" />
                Customer
              </Label>
              <CustomerPicker
                customers={customers}
                value={customerId}
                onValueChange={(nextId, customer) => {
                  setCustomerId(nextId);
                  setSelectedCustomer(customer);
                }}
                offlineRestricted={offlineRestricted}
                onCustomerCreated={onCustomerCreated}
              />
            </div>

            {isDelivery && (
              <div className="space-y-3 rounded-xl border border-[#22C55E]/25 p-4 bg-[#22C55E]/5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#16A34A]" />
                  Delivery details
                </Label>
                <Input
                  placeholder="Delivery address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="h-10 rounded-lg"
                />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Delivery phone"
                      value={deliveryPhone}
                      onChange={(e) => setDeliveryPhone(e.target.value)}
                      className="h-10 rounded-lg"
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      placeholder="Fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={deliveryFeeStr}
                      onChange={(e) => setDeliveryFeeStr(e.target.value)}
                      className="h-10 rounded-lg"
                    />
                  </div>
                </div>
                <Textarea
                  placeholder="Delivery notes..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={2}
                  className="resize-none rounded-lg"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Notes
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="notes"
                placeholder="Special instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none rounded-xl"
              />
            </div>

            {paymentMethod !== "COMPLIMENTARY" && (
              <div className="rounded-xl border border-border p-4 bg-background">
                <SplitPaymentForm
                  ref={splitPaymentRef}
                  total={total}
                  disabled={isProcessing}
                  offlineRestricted={offlineRestricted}
                  hideSubmitButton
                  requireCashReceived
                  onCanSubmitChange={setCanCompletePayment}
                  onSubmitLabelChange={setPaymentSubmitLabel}
                  submitLabel="Complete payment"
                  onSubmit={handleSplitPayment}
                />
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-muted/20 shrink-0 flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="flex-1 h-11 rounded-xl"
          >
            Cancel
          </Button>
          {paymentMethod === "COMPLIMENTARY" ? (
            <Button
              onClick={handleComplimentaryComplete}
              disabled={isProcessing || !isValidComplimentary}
              className="flex-[2] h-11 text-base font-semibold rounded-xl bg-[#22C55E] hover:bg-[#16A34A]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Authorize complimentary
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-[2] h-11 text-base font-semibold rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-md shadow-[#22C55E]/20"
              disabled={isProcessing || !canCompletePayment}
              onClick={() => splitPaymentRef.current?.submit()}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                paymentSubmitLabel
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
