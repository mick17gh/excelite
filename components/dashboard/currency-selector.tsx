"use client";

import { useCurrency } from "@/contexts/currency-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyCode } from "@/lib/currency";

export function CurrencySelector() {
  const { currency, currencyCode, setCurrency, currencies } = useCurrency();

  return (
    <Select value={currencyCode} onValueChange={(value) => setCurrency(value as CurrencyCode)}>
      <SelectTrigger className="w-[100px] h-9 text-xs">
        <SelectValue>
          <span className="flex items-center gap-1.5">
            <span className="font-medium">{currency.symbol}</span>
            <span className="text-muted-foreground">{currencyCode}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {currencies.map((curr) => (
          <SelectItem key={curr.code} value={curr.code}>
            <span className="flex items-center gap-2">
              <span className="font-medium w-8">{curr.symbol}</span>
              <span>{curr.code}</span>
              <span className="text-muted-foreground text-xs">- {curr.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
