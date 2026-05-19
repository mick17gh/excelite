import type { ReportId } from "@/lib/reports/types";

export interface ReportExportConfig {
  primarySheetName: string;
  /** Array key on report data payload for the main detail export */
  primaryDataKey: string;
}

export const REPORT_EXPORT_CONFIG: Partial<Record<ReportId, ReportExportConfig>> = {
  "executive-summary": { primarySheetName: "Executive Report", primaryDataKey: "executiveRows" },
  "weekly-performance": { primarySheetName: "Weekly Digest", primaryDataKey: "weeklyDigestRows" },
  "kitchen-efficiency": { primarySheetName: "Kitchen Efficiency", primaryDataKey: "kitchenRows" },
  "waste-variance": { primarySheetName: "Waste Variance", primaryDataKey: "wasteVarianceRows" },
  "customer-insights": { primarySheetName: "Customer Insights", primaryDataKey: "customerRows" },
  "menu-performance": { primarySheetName: "Menu Performance", primaryDataKey: "menuRows" },
  "cash-transactions": { primarySheetName: "POS Terminal", primaryDataKey: "posTerminalRows" },
  "sales-report": { primarySheetName: "Sales Detail", primaryDataKey: "salesDetailRows" },
  "inventory-report": { primarySheetName: "Branch Inventory", primaryDataKey: "branchInventoryRows" },
  "warehouse-stock": { primarySheetName: "Warehouse Stock", primaryDataKey: "stockLines" },
  "warehouse-activity": { primarySheetName: "Transfers", primaryDataKey: "transfers" },
  "orders-overview": { primarySheetName: "Orders", primaryDataKey: "orderRows" },
  "staff-report": { primarySheetName: "Staff Hours", primaryDataKey: "staffRows" },
  "manual-entries": { primarySheetName: "Manual Entries", primaryDataKey: "manualEntryRows" },
  "pos-sales-report": { primarySheetName: "POS Tickets", primaryDataKey: "posTicketRows" },
};

export function getReportExportConfig(reportId: string): ReportExportConfig | undefined {
  return REPORT_EXPORT_CONFIG[reportId as ReportId];
}
