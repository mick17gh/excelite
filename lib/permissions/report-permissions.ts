import type { ReportId } from "@/lib/reports/types";
import { REPORT_CATALOG, REPORT_IDS } from "@/lib/reports/catalog";

export type ReportTypePermission = `reports:${ReportId}`;

export function reportTypePermission(reportId: ReportId): ReportTypePermission {
  return `reports:${reportId}`;
}

export const ALL_REPORT_TYPE_PERMISSIONS: ReportTypePermission[] = REPORT_IDS.map(
  reportTypePermission,
);

export const REPORT_TYPE_PERMISSION_LABELS: Record<ReportTypePermission, string> =
  Object.fromEntries(
    REPORT_CATALOG.map((entry) => [
      reportTypePermission(entry.id),
      entry.name,
    ]),
  ) as Record<ReportTypePermission, string>;

/** Default bundle for roles that need full report access in code defaults. */
export const FULL_REPORTS_DEFAULTS = [
  "reports:view",
  "reports:export",
  ...ALL_REPORT_TYPE_PERMISSIONS,
] as const;

export const SUPPLIERS_FULL_DEFAULTS = [
  "suppliers:view",
  "suppliers:create",
  "suppliers:edit",
  "suppliers:delete",
] as const;

export const SUPPLIERS_READ_DEFAULTS = ["suppliers:view"] as const;

export function isReportTypePermissionString(permission: string): permission is ReportTypePermission {
  return (
    permission.startsWith("reports:") &&
    permission !== "reports:view" &&
    permission !== "reports:generate" &&
    permission !== "reports:export"
  );
}
