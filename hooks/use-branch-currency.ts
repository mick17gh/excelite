"use client";

import { useEffect } from "react";
import { useCurrency } from "@/contexts/currency-context";
import { CurrencyCode } from "@/lib/currency";

interface Branch {
  id: string;
  currency?: string | null;
}

/**
 * Hook to automatically set currency based on selected branch
 */
export function useBranchCurrency(selectedBranchId: string | null, branches: Branch[]) {
  const { setCurrency } = useCurrency();

  useEffect(() => {
    if (selectedBranchId) {
      const branch = branches.find((b) => b.id === selectedBranchId);
      if (branch?.currency) {
        setCurrency(branch.currency as CurrencyCode);
      }
    }
  }, [selectedBranchId, branches, setCurrency]);
}

/**
 * Hook to set currency based on first branch in list
 */
export function useFirstBranchCurrency(branches: Branch[]) {
  const { setCurrency } = useCurrency();

  useEffect(() => {
    if (branches.length > 0 && branches[0]?.currency) {
      setCurrency(branches[0].currency as CurrencyCode);
    }
  }, [branches, setCurrency]);
}
