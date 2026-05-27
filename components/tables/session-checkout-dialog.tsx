"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  getTableSessionCheckout,
  settleTableSession,
} from "@/lib/actions/table-session-checkout";
import { useCurrency } from "@/contexts/currency-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Building2,
  CreditCard,
  DollarSign,
  Loader2,
  Smartphone,
} from "lucide-react";

const paymentMethods = [
  { value: "CASH", label: "Cash", icon: DollarSign },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "MOBILE_MONEY", label: "Mobile Money", icon: Smartphone },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Building2 },
];

const quickAmounts = [50, 100, 200, 500];

interface SessionCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  onSuccess: () => void;
}

type CheckoutData = {
  sessionId: string;
  tableLabel: string;
  openedByName: string;
  guestCount: number;
  unpaidSubtotal: number;
  unpaidTax: number;
  unpaidTotal: number;
  orders: Array<{
    id: string;
    orderNumber: string;
    subtotal: number;
    tax: number;
    total: number;
    itemCount: number;
  }>;
};

export function SessionCheckoutDialog({
  open,
  onOpenChange,
  sessionId,
  onSuccess,
}: SessionCheckoutDialogProps) {
  const { formatCurrency } = useCurrency();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountPaid, setAmountPaid] = useState("");

  useEffect(() => {
    if (!open || !sessionId) {
      setCheckout(null);
      setAmountPaid("");
      setPaymentMethod("CASH");
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getTableSessionCheckout(sessionId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if ("error" in res && res.error) {
        toast.error(res.error);
        onOpenChange(false);
        return;
      }
      if ("data" in res && res.data) {
        setCheckout(res.data);
        setAmountPaid(res.data.unpaidTotal.toFixed(2));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, sessionId, onOpenChange]);

  useEffect(() => {
    if (open && checkout && paymentMethod !== "CASH") {
      setAmountPaid(checkout.unpaidTotal.toFixed(2));
    }
  }, [paymentMethod, open, checkout]);

  const total = checkout?.unpaidTotal ?? 0;
  const amountPaidNum = Math.round((parseFloat(amountPaid) || 0) * 100) / 100;
  const change = Math.round((amountPaidNum - total) * 100) / 100;
  const isValidPayment =
    paymentMethod === "CASH" ? amountPaidNum >= Math.round(total * 100) / 100 : true;

  const handleSubmit = () => {
    if (!sessionId || !checkout || !isValidPayment) return;
    startTransition(async () => {
      const res = await settleTableSession({
        sessionId,
        paymentMethod,
        amountReceived: paymentMethod === "CASH" ? amountPaidNum : total,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        if ("data" in res && res.data && "partial" in res.data) {
          onSuccess();
        }
        return;
      }
      if ("data" in res && res.data && "tabTotal" in res.data) {
        const { tableLabel, orderCount, change = 0 } = res.data;
        const msg =
          change > 0
            ? `Table ${tableLabel} paid — change ${formatCurrency(change)}`
            : `Table ${tableLabel} — ${orderCount} check(s) paid`;
        toast.success(msg);
        onOpenChange(false);
        onSuccess();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-xl">Pay table tab</DialogTitle>
          {checkout && (
            <p className="text-sm text-muted-foreground">
              Table {checkout.tableLabel} · {checkout.guestCount} covers ·{" "}
              {checkout.openedByName}
            </p>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {checkout && !loading && (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Unpaid checks
                  </p>
                  {checkout.orders.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{o.orderNumber}</span>
                        <span className="text-muted-foreground ml-2">
                          {o.itemCount} item{o.itemCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <span className="font-semibold">{formatCurrency(o.total)}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(checkout.unpaidSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(checkout.unpaidTax)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-semibold">
                    <span>Tab total</span>
                    <span className="text-primary">{formatCurrency(checkout.unpaidTotal)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((m) => {
                    const Icon = m.icon;
                    const active = paymentMethod === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        className={cn(
                          "flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors",
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30",
                        )}
                        onClick={() => setPaymentMethod(m.value)}
                      >
                        <Icon className="h-4 w-4" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                {paymentMethod === "CASH" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="amount-paid">Amount received</Label>
                      <Input
                        id="amount-paid"
                        type="number"
                        step="0.01"
                        min={0}
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {quickAmounts.map((a) => (
                        <Button
                          key={a}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setAmountPaid(
                              (amountPaidNum + a).toFixed(2),
                            )
                          }
                        >
                          +{formatCurrency(a)}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAmountPaid(total.toFixed(2))}
                      >
                        Exact
                      </Button>
                    </div>
                    {change > 0 && (
                      <p className="text-sm font-medium text-emerald-600">
                        Change: {formatCurrency(change)}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || loading || !checkout || !isValidPayment}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Pay {checkout ? formatCurrency(checkout.unpaidTotal) : ""}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
