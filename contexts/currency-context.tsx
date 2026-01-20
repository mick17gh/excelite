"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  CurrencyCode,
  CurrencyConfig,
  CURRENCIES,
  formatCurrency as formatCurrencyUtil,
  formatCurrencyShort as formatCurrencyShortUtil,
  getCurrentCurrency,
  setCurrentCurrency as setGlobalCurrency,
  getAllCurrencies,
} from "@/lib/currency";

interface CurrencyContextType {
  currency: CurrencyConfig;
  currencyCode: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  formatCurrency: (value: number, compact?: boolean) => string;
  formatCurrencyShort: (value: number) => string;
  currencies: CurrencyConfig[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_STORAGE_KEY = "dinelytix_currency";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>("GHS");
  const [currency, setCurrencyConfig] = useState<CurrencyConfig>(CURRENCIES.GHS);

  useEffect(() => {
    // Load saved currency from localStorage on mount
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY) as CurrencyCode | null;
    if (saved && CURRENCIES[saved]) {
      setCurrencyCode(saved);
      setCurrencyConfig(CURRENCIES[saved]);
      setGlobalCurrency(saved);
    }
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    if (CURRENCIES[code]) {
      setCurrencyCode(code);
      setCurrencyConfig(CURRENCIES[code]);
      setGlobalCurrency(code);
      localStorage.setItem(CURRENCY_STORAGE_KEY, code);
    }
  }, []);

  const formatCurrency = useCallback(
    (value: number, compact?: boolean) => {
      return formatCurrencyUtil(value, { currency: currencyCode, compact });
    },
    [currencyCode]
  );

  const formatCurrencyShort = useCallback(
    (value: number) => {
      return formatCurrencyShortUtil(value, currencyCode);
    },
    [currencyCode]
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencyCode,
        setCurrency,
        formatCurrency,
        formatCurrencyShort,
        currencies: getAllCurrencies(),
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
