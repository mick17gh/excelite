"use client";

export const SUPPLIER_LEAD_TIMES = [
  { value: "SAME_DAY", label: "Same Day" },
  { value: "NEXT_DAY", label: "Next Day" },
  { value: "THREE_TO_SEVEN_DAYS", label: "3-7 Days" },
  { value: "THIRTY_DAYS", label: "30 Days" },
] as const;

export const SUPPLIER_CONSISTENCY = [
  { value: "HIGHLY_RELIABLE", label: "Highly Reliable" },
  { value: "HIT_OR_MISS", label: "Hit or Miss" },
  { value: "BACKUP_ONLY", label: "Backup Only" },
] as const;

export const SUPPLIER_CORE_CATEGORIES = [
  { value: "PERISHABLES", label: "Perishables" },
  { value: "DRY_GOODS", label: "Dry Goods" },
  { value: "BEVERAGES", label: "Beverages" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "CLEANING_SUPPLIES", label: "Cleaning Supplies" },
] as const;

export const SUPPLIER_PAYMENT_METHODS = [
  { value: "MOMO_PREFERRED", label: "MoMo Preferred" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CASH_ONLY", label: "Cash Only" },
] as const;

export const SUPPLIER_QUALITY_RATINGS = [
  { value: "GRADE_A", label: "Grade A" },
  { value: "STANDARD", label: "Standard" },
  { value: "BARGAIN_GRADE", label: "Bargain Grade" },
] as const;

export function formatEnumLabel(value: string | null | undefined) {
  if (!value) return "—";
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
