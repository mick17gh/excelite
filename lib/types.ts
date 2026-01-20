import { Role } from "./auth";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  branchId: string | null;
  isActive: boolean;
  image?: string | null;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  isActive: boolean;
}

export interface KPIData {
  label: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  trend?: "up" | "down" | "neutral";
  format?: "currency" | "percentage" | "number";
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface SalesMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  cogsPercentage: number;
  profitMargin: number;
  transactionCount: number;
  averageTicket: number;
}

export interface BranchPerformance {
  branchId: string;
  branchName: string;
  branchCode: string;
  revenue: number;
  transactions: number;
  waste: number;
  target: number;
  performance: number;
  status: "good" | "warning" | "critical";
}

export interface InventoryAlert {
  itemId: string;
  itemName: string;
  branchId: string;
  branchName: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  alertType: "low" | "overstock";
}

export interface StaffSummary {
  branchId: string;
  branchName: string;
  totalStaff: number;
  onDuty: number;
  offDuty: number;
  required: number;
  status: "adequate" | "understaffed" | "overstaffed";
}

export interface AlertItem {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  branchName?: string;
  triggeredAt: Date;
  status: "active" | "acknowledged" | "resolved" | "dismissed";
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface FilterState {
  dateRange: DateRange;
  branchIds: string[];
  dayParts: string[];
  channels: string[];
}

export type Period = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  totalSold: number;
  revenue: number;
  profit: number;
  profitMargin: number;
}

export interface SalesByDaypart {
  daypart: string;
  revenue: number;
  transactions: number;
  percentage: number;
}

export interface SalesByChannel {
  channel: string;
  revenue: number;
  transactions: number;
  percentage: number;
}
