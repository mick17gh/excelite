"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { CreditCard, DollarSign, Smartphone, Building2, Loader2, Check, User, FileText, ChevronsUpDown, UserPlus, MapPin, UtensilsCrossed, Package, Truck, WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createCustomer } from "@/lib/actions/customers";
import { useCurrency } from "@/contexts/currency-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  phone: string;
}

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
  /** Sum of line prices (customer-facing merchandise total before delivery) */
  lineTotal?: number;
  onComplete: (paymentData: PaymentData) => void;
  isProcessing?: boolean;
  customers?: Customer[];
  orderType?: string;
  onOrderTypeChange?: (type: string) => void;
  /** When true: cash only, no delivery type, no new customers (POS offline guardrails). */
  offlineRestricted?: boolean;
  allowComplimentary?: boolean;
}

export interface PaymentData {
  paymentMethod: string;
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

const orderTypeOptions = [
  { value: "DINE_IN", label: "Dine-in", icon: UtensilsCrossed, color: "bg-emerald-500/10 border-emerald-500 text-emerald-600" },
  { value: "TAKEOUT", label: "Takeout", icon: Package, color: "bg-amber-500/10 border-amber-500 text-amber-600" },
  { value: "DELIVERY", label: "Delivery", icon: Truck, color: "bg-blue-500/10 border-blue-500 text-blue-600" },
];

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
}: PaymentModalProps) {
  const { formatCurrency } = useCurrency();
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [localOrderType, setLocalOrderType] = useState(initialOrderType);
  const [notes, setNotes] = useState("");
  const [complimentaryReason, setComplimentaryReason] = useState("");

  // Customer combobox state
  const [customerId, setCustomerId] = useState<string>("walk-in");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [localCustomers, setLocalCustomers] = useState<Customer[]>(customers);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const wasOpenRef = useRef(false);

  // Delivery fields
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryFeeStr, setDeliveryFeeStr] = useState("");
  const deliveryFee = parseFloat(deliveryFeeStr) || 0;
  const isDelivery = localOrderType === "DELIVERY" && !offlineRestricted;
  const total = Math.round((isDelivery ? totalProp + deliveryFee : totalProp) * 100) / 100;

  const orderTypeOptionsFiltered = offlineRestricted
    ? orderTypeOptions.filter((o) => o.value !== "DELIVERY")
    : orderTypeOptions;

  const paymentMethodsFiltered = offlineRestricted
    ? paymentMethods.filter((m) => m.value === "CASH")
    : [
        ...paymentMethods,
        ...(allowComplimentary
          ? [{ value: "COMPLIMENTARY", label: "Complimentary", icon: Check, color: "bg-rose-500/10 border-rose-500 text-rose-600" }]
          : []),
      ];

  const handleOrderTypeChange = (type: string) => {
    setLocalOrderType(type);
    onOrderTypeChange?.(type);
  };

  const selectedCustomerLabel = useMemo(() => {
    if (customerId === "walk-in") return "Walk-in Customer";
    const c = localCustomers.find((c) => c.id === customerId);
    return c ? `${c.name} (${c.phone})` : "Walk-in Customer";
  }, [customerId, localCustomers]);

  const handleCreateCustomer = async () => {
    if (!newCustName.trim() || !newCustPhone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    setIsCreatingCustomer(true);
    try {
      const result = await createCustomer({ name: newCustName.trim(), phone: newCustPhone.trim() });
      if (result.error) { toast.error(result.error); return; }
      if (result.data) {
        const nc = {
          id: result.data.id,
          name: result.data.name,
          phone: result.data.phone ?? newCustPhone.trim(),
        };
        setLocalCustomers((prev) => {
          const without = prev.filter((c) => c.id !== nc.id);
          return [nc, ...without];
        });
        setCustomerId(nc.id);
        setShowNewCustomer(false);
        setNewCustName("");
        setNewCustPhone("");
        setCustomerOpen(false);
        toast.success(`Customer "${nc.name}" selected`);
      }
    } catch {
      toast.error("Failed to create customer");
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Reset payment fields only when the modal opens (not when `customers` prop refreshes after create)
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;

    if (justOpened) {
      setPaymentMethod("CASH");
      setAmountPaid("");
      setCustomerId("walk-in");
      setNotes("");
      setDeliveryAddress("");
      setDeliveryPhone("");
      setDeliveryNotes("");
      setDeliveryFeeStr("");
      setComplimentaryReason("");
      setShowNewCustomer(false);
    }

    const nextType =
      offlineRestricted && initialOrderType === "DELIVERY" ? "DINE_IN" : initialOrderType;
    setLocalOrderType(nextType);
    if (justOpened && offlineRestricted && initialOrderType === "DELIVERY") {
      onOrderTypeChange?.("DINE_IN");
    }

    setLocalCustomers((prev) => {
      const merged = new Map<string, Customer>();
      for (const c of customers) merged.set(c.id, c);
      for (const c of prev) merged.set(c.id, c);
      return Array.from(merged.values());
    });
  }, [open, offlineRestricted, initialOrderType, customers, onOrderTypeChange]);

  // Update amount when payment method or total changes
  useEffect(() => {
    if (open) {
      setAmountPaid(paymentMethod === "CASH" ? "" : total.toFixed(2));
    }
  }, [paymentMethod, total, open]);

  const amountPaidNum = Math.round((parseFloat(amountPaid) || 0) * 100) / 100;
  const change = Math.round((amountPaidNum - total) * 100) / 100;
  const isValidPayment =
    paymentMethod === "COMPLIMENTARY"
      ? complimentaryReason.trim().length > 0
      : paymentMethod === "CASH"
        ? amountPaidNum >= Math.round(total * 100) / 100
        : true;

  const handleComplete = () => {
    if (!isValidPayment) return;

    const selectedCustomer = localCustomers.find((c) => c.id === customerId);
    onComplete({
      paymentMethod,
      amountPaid: paymentMethod === "COMPLIMENTARY" ? 0 : paymentMethod === "CASH" ? amountPaidNum : total,
      change: paymentMethod === "CASH" ? Math.max(0, change) : 0,
      customerId: customerId !== "walk-in" ? customerId : undefined,
      customerName: selectedCustomer?.name || undefined,
      orderType: localOrderType,
      notes: notes.trim() || undefined,
      complimentaryReason:
        paymentMethod === "COMPLIMENTARY" ? complimentaryReason.trim() : undefined,
      ...(isDelivery ? {
        deliveryAddress: deliveryAddress.trim() || undefined,
        deliveryPhone: deliveryPhone.trim() || undefined,
        deliveryNotes: deliveryNotes.trim() || undefined,
        deliveryFee: deliveryFee || undefined,
      } : {}),
    });
  };

  const handleQuickAmount = (amount: number) => {
    const newAmount = (amountPaidNum || 0) + amount;
    setAmountPaid(newAmount.toFixed(2));
  };

  const handleExactAmount = () => {
    setAmountPaid(total.toFixed(2));
  };

  const displayTax = tax ?? 0;
  const displaySubtotal = subtotal ?? (lineTotal != null ? lineTotal - (taxInclusive ? displayTax : 0) : total - displayTax);
  const merchandiseTotal = lineTotal ?? (taxInclusive ? totalProp : totalProp);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-xl">Complete Payment</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {offlineRestricted ? (
              <Alert className="border-amber-500/50 bg-amber-500/5">
                <WifiOff className="text-amber-700" />
                <AlertDescription className="text-amber-900 dark:text-amber-200">
                  Offline checkout: cash only, dine-in or takeout. Orders sync when you are back online;
                  kitchen and inventory update after sync (not in real time while offline).
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Order Type Selector */}
            <div className={cn("grid gap-2", offlineRestricted ? "grid-cols-2" : "grid-cols-3")}>
              {orderTypeOptionsFiltered.map((opt) => {
                const Icon = opt.icon;
                const isActive = localOrderType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center",
                      isActive ? opt.color : "border-border hover:border-muted-foreground/30"
                    )}
                    onClick={() => handleOrderTypeChange(opt.value)}
                  >
                    <Icon className={cn("h-5 w-5", !isActive && "text-muted-foreground")} />
                    <span className={cn("text-xs font-medium", !isActive && "text-muted-foreground")}>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="rounded-xl bg-muted/50 p-4 space-y-3">
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
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold text-lg">Total</span>
                <span className="font-bold text-xl text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Payment Method</Label>
              <div className={cn("grid gap-3", offlineRestricted ? "grid-cols-1" : "grid-cols-2")}>
                {paymentMethodsFiltered.map((method) => {
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

            {paymentMethod === "COMPLIMENTARY" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Authorization reason *</Label>
                <Textarea
                  value={complimentaryReason}
                  onChange={(e) => setComplimentaryReason(e.target.value)}
                  placeholder="e.g. CEO approval, staff meal, VIP guest"
                  rows={2}
                />
              </div>
            )}

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

            {/* Customer Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Customer
              </Label>
              <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={customerOpen} className="w-full justify-between h-10 font-normal">
                    <span className="truncate">{selectedCustomerLabel}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  {!showNewCustomer ? (
                    <Command>
                      <CommandInput placeholder="Search customers..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        {!offlineRestricted ? (
                          <>
                            <CommandGroup>
                              <CommandItem onSelect={() => setShowNewCustomer(true)}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add New Customer
                              </CommandItem>
                            </CommandGroup>
                            <CommandSeparator />
                          </>
                        ) : null}
                        <CommandGroup>
                          <CommandItem value="walk-in" onSelect={() => { setCustomerId("walk-in"); setCustomerOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", customerId === "walk-in" ? "opacity-100" : "opacity-0")} />
                            Walk-in Customer
                          </CommandItem>
                          {localCustomers.map((c) => (
                            <CommandItem key={c.id} value={`${c.name} ${c.phone}`} onSelect={() => { setCustomerId(c.id); setCustomerOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", customerId === c.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span>{c.name}</span>
                                <span className="text-xs text-muted-foreground">{c.phone}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  ) : (
                    <div className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">New Customer</Label>
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowNewCustomer(false)}>Cancel</Button>
                      </div>
                      <Input placeholder="Customer name" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} autoFocus />
                      <Input placeholder="Phone number" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} />
                      <Button size="sm" className="w-full" onClick={handleCreateCustomer} disabled={isCreatingCustomer || !newCustName.trim() || !newCustPhone.trim()}>
                        {isCreatingCustomer ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <UserPlus className="mr-2 h-3 w-3" />}
                        {isCreatingCustomer ? "Creating..." : "Create & Select"}
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Delivery Fields */}
            {isDelivery && (
              <div className="space-y-3 rounded-xl border p-4 bg-blue-500/5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  Delivery Details
                </Label>
                <Input
                  placeholder="Delivery address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="h-10"
                />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Delivery phone"
                      value={deliveryPhone}
                      onChange={(e) => setDeliveryPhone(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      placeholder="Del. fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={deliveryFeeStr}
                      onChange={(e) => setDeliveryFeeStr(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
                <Textarea
                  placeholder="Delivery notes..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            )}

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
