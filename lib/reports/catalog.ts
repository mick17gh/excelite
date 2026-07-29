import type { ReportId } from "@/lib/reports/types";

export type ReportCatalogEntry = {
  id: ReportId;
  name: string;
  description: string;
  category: string;
  tableManagementOnly?: boolean;
};

/** Canonical report list — shared by UI and permission matrix labels. */
export const REPORT_CATALOG: ReportCatalogEntry[] = [
  {
    id: "executive-summary",
    name: "Executive Performance & Insight",
    description: "Per-branch P&L, margins, YTD growth, and customer loyalty metrics",
    category: "Executive",
  },
  {
    id: "weekly-performance",
    name: "Weekly Performance Digest",
    description: "Daily sales, WoW growth, peak hours, labor cost, and void/refund tracking",
    category: "Performance",
  },
  {
    id: "kitchen-efficiency",
    name: "Kitchen & Operational Efficiency",
    description: "Prep times, SLA variance, and kitchen throughput KPIs",
    category: "Operations",
  },
  {
    id: "menu-performance",
    name: "Menu Performance",
    description: "Item profitability, add-on rates, and Star/Dog/Puzzle/Workhorse ranking",
    category: "Sales",
  },
  {
    id: "sales-report",
    name: "Sales & Revenue Report",
    description: "Comprehensive sales data by channel, daypart, and menu items",
    category: "Sales",
  },
  {
    id: "cash-transactions",
    name: "Transactions Report",
    description: "Payments by method, references, and success/fail status",
    category: "Finance",
  },
  {
    id: "orders-overview",
    name: "Orders Report",
    description: "Orders by status, source, channel type, and branch with line-level export",
    category: "Orders",
  },
  {
    id: "manual-entries",
    name: "Manual Entries Report",
    description: "Summary of all manual POS entries including revenue by channel and branch",
    category: "Sales",
  },
  {
    id: "inventory-report",
    name: "Branch Inventory Status",
    description:
      "On-hand stock at each branch (retail / kitchen). Hub stock is in warehouse reports.",
    category: "Inventory",
  },
  {
    id: "warehouse-stock",
    name: "Warehouse Stock Report",
    description: "Central hub quantities, valuation, and low-stock lines by warehouse",
    category: "Warehouse",
  },
  {
    id: "warehouse-activity",
    name: "Warehouse Activity",
    description:
      "Transfers to branches, inbound receipts, warehouse waste, and outbound usage/adjustments",
    category: "Warehouse",
  },
  {
    id: "waste-variance",
    name: "Waste & Variance Report",
    description: "Waste analysis, shrinkage tracking, and variance explanations",
    category: "Operations",
  },
  {
    id: "reconciliation-summary",
    name: "Stock Reconciliation Summary",
    description: "End-of-shift count sessions with shortage, overage, and variance cost by branch",
    category: "Inventory",
  },
  {
    id: "staff-report",
    name: "Staff Scheduling Report",
    description: "Staff utilization, shift coverage, and labor cost analysis",
    category: "HR",
  },
  {
    id: "dine-in-service",
    name: "Dine-In & Table Service",
    description: "Closed table sessions: covers, revenue per cover, and turn times",
    category: "Operations",
    tableManagementOnly: true,
  },
  {
    id: "waiter-performance",
    name: "Waiter Performance",
    description: "Tables served, covers, sales, and average turn time by waiter",
    category: "Operations",
    tableManagementOnly: true,
  },
  {
    id: "table-section-performance",
    name: "Table Section Performance",
    description: "Dine-in metrics grouped by dining section",
    category: "Operations",
    tableManagementOnly: true,
  },
  {
    id: "customer-insights",
    name: "Customer Insights",
    description: "Repeat buyers, revenue by customer, and ranking for loyalty follow-ups",
    category: "Customers",
  },
  {
    id: "pos-sales-report",
    name: "POS Terminal Sales",
    description: "In-venue POS tickets, channels, and top menu items",
    category: "POS",
  },
];

/** Reports shown on the Excelite Reports page. */
export const PRIMARY_REPORT_IDS: ReportId[] = [
  "sales-report",
  "cash-transactions",
  "orders-overview",
];

export const REPORT_IDS = REPORT_CATALOG.map((r) => r.id) as ReportId[];
