"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { cn } from "@/lib/utils";
import {
  SPLITTABLE_PAYMENT_METHODS,
  type SplittablePaymentMethodCode,
} from "@/lib/payments/payment-methods";
import {
  MAX_TENDER_LINES,
  roundMoney,
  sumTenderAmounts,
  validateTenders,
  type PaymentTender,
} from "@/lib/payments/tenders";

type TenderLine = {
  id: string;
  method: SplittablePaymentMethodCode;
  amount: string;
  reference: string;
  amountReceived: string;
};

function newLine(method: SplittablePaymentMethodCode = "CASH", amount = ""): TenderLine {
  return {
    id: crypto.randomUUID(),
    method,
    amount,
    reference: "",
    amountReceived: "",
  };
}

function linesToTenders(lines: TenderLine[]): PaymentTender[] {
  return lines
    .map((line) => ({
      method: line.method,
      amount: roundMoney(parseFloat(line.amount) || 0),
      reference: line.reference.trim() || undefined,
      amountReceived:
        line.method === "CASH" && line.amountReceived.trim()
          ? roundMoney(parseFloat(line.amountReceived) || 0)
          : undefined,
    }))
    .filter((t) => t.amount > 0);
}

export interface SplitPaymentFormProps {
  total: number;
  disabled?: boolean;
  offlineRestricted?: boolean;
  submitLabel?: string;
  showSplitToggle?: boolean;
  onSubmit: (tenders: PaymentTender[]) => void;
}

export function SplitPaymentForm({
  total,
  disabled = false,
  offlineRestricted = false,
  submitLabel = "Complete payment",
  showSplitToggle = true,
  onSubmit,
}: SplitPaymentFormProps) {
  const { formatCurrency } = useCurrency();
  const [splitMode, setSplitMode] = useState(false);
  const [lines, setLines] = useState<TenderLine[]>([newLine("CASH", total.toFixed(2))]);

  const methods = offlineRestricted
    ? SPLITTABLE_PAYMENT_METHODS.filter((m) => m.value === "CASH")
    : SPLITTABLE_PAYMENT_METHODS;

  useEffect(() => {
    if (!splitMode) {
      setLines([newLine("CASH", total.toFixed(2))]);
    }
  }, [total, splitMode]);

  const allocated = useMemo(
    () => roundMoney(lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0)),
    [lines],
  );
  const remaining = roundMoney(total - allocated);

  const tenders = linesToTenders(lines);
  const tenderValidation = useMemo(() => {
    if (remaining !== 0 || tenders.length === 0) return null;
    return validateTenders(total, tenders);
  }, [remaining, tenders, total]);
  const canSubmit =
    remaining === 0 &&
    tenders.length > 0 &&
    !disabled &&
    (tenderValidation?.ok ?? false);
  const cashChange = tenders.reduce((change, tender) => {
    if (tender.method !== "CASH") return change;
    const received = tender.amountReceived ?? tender.amount;
    return roundMoney(change + Math.max(0, received - tender.amount));
  }, 0);

  const updateLine = (id: string, patch: Partial<TenderLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const addLine = () => {
    if (lines.length >= MAX_TENDER_LINES) return;
    const fill = remaining > 0 ? remaining.toFixed(2) : "";
    setLines((prev) => [...prev, newLine("MOBILE_MONEY", fill)]);
  };

  const removeLine = (id: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  };

  const fillRemaining = (id: string) => {
    if (remaining <= 0) return;
    updateLine(id, { amount: (roundMoney((parseFloat(lines.find((l) => l.id === id)?.amount || "0")) + remaining)).toFixed(2) });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(tenders);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
        <div>
          <p className="text-xs text-muted-foreground">Amount due</p>
          <p className="text-lg font-bold">{formatCurrency(total)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p
            className={cn(
              "text-lg font-bold",
              remaining === 0 ? "text-emerald-600" : remaining < 0 ? "text-destructive" : "",
            )}
          >
            {formatCurrency(remaining)}
          </p>
        </div>
      </div>

      {showSplitToggle && !offlineRestricted && (
        <div className="flex items-center justify-between">
          <Label htmlFor="split-mode" className="text-sm">
            Split payment
          </Label>
          <Switch
            id="split-mode"
            checked={splitMode}
            onCheckedChange={(checked) => {
              setSplitMode(checked);
              if (!checked) {
                setLines([newLine("CASH", total.toFixed(2))]);
              } else if (lines.length === 1) {
                const first = lines[0];
                setLines([
                  { ...first, amount: "" },
                  newLine("MOBILE_MONEY", ""),
                ]);
              }
            }}
          />
        </div>
      )}

      {offlineRestricted && (
        <p className="text-xs text-muted-foreground">
          Offline mode: cash-only, single payment. Split payment requires an online connection.
        </p>
      )}

      <div className="space-y-3">
        {lines.map((line, index) => {
          const methodMeta = methods.find((m) => m.value === line.method) ?? methods[0];
          const Icon = methodMeta.icon;
          return (
            <div key={line.id} className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4" />
                  Payment {index + 1}
                </div>
                {splitMode && lines.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeLine(line.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Method</Label>
                  <Select
                    value={line.method}
                    onValueChange={(v) =>
                      updateLine(line.id, {
                        method: v as SplittablePaymentMethodCode,
                        amountReceived: "",
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {methods.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-9"
                      value={line.amount}
                      onChange={(e) => updateLine(line.id, { amount: e.target.value })}
                    />
                    {splitMode && remaining > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 shrink-0 text-xs"
                        onClick={() => fillRemaining(line.id)}
                      >
                        Fill
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {line.method === "CASH" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Cash received</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className={cn(
                      "h-9",
                      line.amountReceived.trim() &&
                        (parseFloat(line.amountReceived) || 0) < (parseFloat(line.amount) || 0) &&
                        "border-destructive focus-visible:ring-destructive",
                    )}
                    placeholder={line.amount || "0.00"}
                    value={line.amountReceived}
                    onChange={(e) => updateLine(line.id, { amountReceived: e.target.value })}
                  />
                  {line.amountReceived.trim() &&
                    (parseFloat(line.amountReceived) || 0) < (parseFloat(line.amount) || 0) && (
                      <p className="text-xs text-destructive">
                        Cash received must be at least {formatCurrency(parseFloat(line.amount) || 0)}
                      </p>
                    )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs">Reference (optional)</Label>
                  <Input
                    className="h-9"
                    placeholder="Transaction / auth reference"
                    value={line.reference}
                    onChange={(e) => updateLine(line.id, { reference: e.target.value })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {splitMode && lines.length < MAX_TENDER_LINES && (
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={addLine}>
          <Plus className="mr-2 h-4 w-4" />
          Add payment method
        </Button>
      )}

      {cashChange > 0 && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-center">
          <p className="text-xs text-muted-foreground">Change</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(cashChange)}</p>
        </div>
      )}

      <Button
        type="button"
        className="w-full"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {submitLabel}
        {canSubmit && splitMode && ` (${sumTenderAmounts(tenders)} allocated)`}
      </Button>
    </div>
  );
}
