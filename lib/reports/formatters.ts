import { Role } from "@/lib/generated/prisma/client";
import { format } from "date-fns";

const ADMIN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN];

export function formatReportDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "dd-MM-yyyy HH:mm");
}

export function formatReportDateOnly(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "dd-MM-yyyy");
}

/** Excel-style decimal percent (0.6286 for 62.86%). */
export function formatPercentDecimal(
  numerator: number,
  denominator: number,
  decimals = 4
): number {
  if (!denominator) return 0;
  const v = numerator / denominator;
  const factor = 10 ** decimals;
  return Math.round(v * factor) / factor;
}

/** UI preview: "62.9%" */
export function formatPercentDisplay(
  numerator: number,
  denominator: number,
  decimals = 1
): string {
  if (!denominator) return "0%";
  return `${((numerator / denominator) * 100).toFixed(decimals)}%`;
}

export function wowPercent(current: number, previous: number): number {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

export function branchContributionPercent(branchRevenue: number, totalRevenue: number): number {
  return formatPercentDecimal(branchRevenue, totalRevenue);
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function canViewCustomerPii(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return "***";
  return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
}

export function maskCustomerName(name: string): string {
  if (!name) return "Customer";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return `${parts[0][0]}.***`;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function applyCustomerPiiMask<T extends Record<string, unknown>>(
  row: T,
  role: Role,
  nameKey = "Customer Name",
  phoneKey = "Phone Number"
): T {
  if (canViewCustomerPii(role)) return row;
  const out = { ...row };
  if (nameKey in out && typeof out[nameKey] === "string") {
    (out as Record<string, unknown>)[nameKey] = maskCustomerName(out[nameKey] as string);
  }
  if (phoneKey in out && typeof out[phoneKey] === "string") {
    (out as Record<string, unknown>)[phoneKey] = maskPhone(out[phoneKey] as string);
  }
  return out;
}

export function mapOrderSourceLabel(source: string): string {
  const map: Record<string, string> = {
    CALL_CENTER: "Call Center",
    ONLINE: "Online",
    WHATSAPP: "WhatsApp",
    WALK_IN: "Walk-in",
    POS: "POS",
    SOCIAL_MEDIA: "Social Media",
  };
  return map[source] || source;
}

export type MenuQuadrant = "Star" | "Workhorse" | "Puzzle" | "Dog";

export function classifyMenuItem(
  profitPct: number,
  quantitySold: number,
  medianProfitPct: number,
  medianQty: number
): MenuQuadrant {
  const highProfit = profitPct >= medianProfitPct;
  const highPop = quantitySold >= medianQty;
  if (highProfit && highPop) return "Star";
  if (!highProfit && highPop) return "Workhorse";
  if (highProfit && !highPop) return "Puzzle";
  return "Dog";
}

export function prepDurationMinutes(receipt: Date, ready: Date): number {
  return Math.round((ready.getTime() - receipt.getTime()) / 60000);
}

export function formatTimeOnly(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "HH:mm");
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function dayOfWeekName(date: Date): string {
  return DAY_NAMES[date.getDay()];
}
