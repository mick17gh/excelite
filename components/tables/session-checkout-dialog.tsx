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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SplitPaymentForm } from "@/components/payments/split-payment-form";
import type { PaymentTender } from "@/lib/payments/tenders";
import {
  getTableSessionCheckout,
  settleTableSession,
} from "@/lib/actions/table-session-checkout";
import { useCurrency } from "@/contexts/currency-context";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

  useEffect(() => {
    if (!open || !sessionId) {
      setCheckout(null);
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
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, sessionId, onOpenChange]);

  const handleSplitPayment = (tenders: PaymentTender[]) => {
    if (!sessionId || !checkout) return;
    startTransition(async () => {
      const res = await settleTableSession({
        sessionId,
        tenders,
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

                <SplitPaymentForm
                  total={checkout.unpaidTotal}
                  disabled={isPending}
                  submitLabel={isPending ? "Processing..." : `Pay ${formatCurrency(checkout.unpaidTotal)}`}
                  onSubmit={handleSplitPayment}
                />
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="w-full">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
