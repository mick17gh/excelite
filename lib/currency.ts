export type CurrencyCode = "USD" | "GHS" | "EUR" | "GBP" | "NGN" | "KES" | "ZAR";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  decimalPlaces: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    locale: "en-US",
    decimalPlaces: 2,
  },
  GHS: {
    code: "GHS",
    symbol: "GH₵",
    name: "Ghana Cedi",
    locale: "en-GH",
    decimalPlaces: 2,
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    locale: "en-EU",
    decimalPlaces: 2,
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    locale: "en-GB",
    decimalPlaces: 2,
  },
  NGN: {
    code: "NGN",
    symbol: "₦",
    name: "Nigerian Naira",
    locale: "en-NG",
    decimalPlaces: 2,
  },
  KES: {
    code: "KES",
    symbol: "KSh",
    name: "Kenyan Shilling",
    locale: "en-KE",
    decimalPlaces: 2,
  },
  ZAR: {
    code: "ZAR",
    symbol: "R",
    name: "South African Rand",
    locale: "en-ZA",
    decimalPlaces: 2,
  },
};

// Default currency - can be changed via environment variable or settings
const DEFAULT_CURRENCY: CurrencyCode = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY as CurrencyCode) || "GHS";

let currentCurrency: CurrencyCode = DEFAULT_CURRENCY;

export function setCurrentCurrency(code: CurrencyCode): void {
  if (CURRENCIES[code]) {
    currentCurrency = code;
  }
}

export function getCurrentCurrency(): CurrencyConfig {
  return CURRENCIES[currentCurrency];
}

export function getCurrentCurrencyCode(): CurrencyCode {
  return currentCurrency;
}

export function formatCurrency(
  value: number,
  options?: {
    currency?: CurrencyCode;
    showSymbol?: boolean;
    compact?: boolean;
    decimals?: number;
  }
): string {
  const currencyCode = options?.currency || currentCurrency;
  const config = CURRENCIES[currencyCode];
  const showSymbol = options?.showSymbol !== false;
  const compact = options?.compact || false;
  const decimals = options?.decimals ?? config.decimalPlaces;

  if (compact && Math.abs(value) >= 1000) {
    const formatter = new Intl.NumberFormat(config.locale, {
      notation: "compact",
      compactDisplay: "short",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    const formatted = formatter.format(value);
    return showSymbol ? `${config.symbol}${formatted}` : formatted;
  }

  const formatter = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const formatted = formatter.format(value);
  return showSymbol ? `${config.symbol}${formatted}` : formatted;
}

export function formatCurrencyShort(value: number, currency?: CurrencyCode): string {
  return formatCurrency(value, { currency, compact: true });
}

export function formatCurrencyFull(value: number, currency?: CurrencyCode): string {
  const currencyCode = currency || currentCurrency;
  const config = CURRENCIES[currencyCode];
  
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces,
  }).format(value);
}

export function parseCurrencyInput(input: string): number {
  // Remove currency symbols and formatting
  const cleaned = input.replace(/[^0-9.-]/g, "");
  return parseFloat(cleaned) || 0;
}

export function getCurrencySymbol(currency?: CurrencyCode): string {
  const currencyCode = currency || currentCurrency;
  return CURRENCIES[currencyCode].symbol;
}

export function getAllCurrencies(): CurrencyConfig[] {
  return Object.values(CURRENCIES);
}
