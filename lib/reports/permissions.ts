import type { ReportId } from "@/lib/reports/types";
import { hasAnyPermissionInList, hasPermissionInList } from "@/lib/permissions/check-list";
import type { Permission } from "@/lib/permissions/types";
import { REPORT_IDS } from "@/lib/reports/catalog";
import {
  ALL_REPORT_TYPE_PERMISSIONS,
  reportTypePermission,
} from "@/lib/permissions/report-permissions";

export type { ReportTypePermission } from "@/lib/permissions/report-permissions";
export {
  ALL_REPORT_TYPE_PERMISSIONS,
  FULL_REPORTS_DEFAULTS,
  REPORT_TYPE_PERMISSION_LABELS,
  SUPPLIERS_FULL_DEFAULTS,
  SUPPLIERS_READ_DEFAULTS,
  reportTypePermission,
} from "@/lib/permissions/report-permissions";

const REPORT_META_PERMISSIONS = [
  "reports:view",
  "reports:generate",
  "reports:export",
] as const satisfies readonly Permission[];

export const REPORTS_MODULE_PERMISSIONS: Permission[] = [
  ...REPORT_META_PERMISSIONS,
  ...ALL_REPORT_TYPE_PERMISSIONS,
];

export function canAccessReport(
  permissions: Permission[],
  reportId: ReportId,
): boolean {
  if (hasPermissionInList(permissions, "reports:generate")) return true;
  return hasPermissionInList(permissions, reportTypePermission(reportId));
}

export function canExportReports(permissions: Permission[]): boolean {
  return (
    hasPermissionInList(permissions, "reports:export") ||
    hasPermissionInList(permissions, "reports:generate")
  );
}

export function canAccessReportsModule(permissions: Permission[]): boolean {
  if (hasPermissionInList(permissions, "reports:generate")) return true;
  if (hasAnyPermissionInList(permissions, ALL_REPORT_TYPE_PERMISSIONS)) return true;
  return hasPermissionInList(permissions, "reports:view");
}

export function getAccessibleReportIds(permissions: Permission[]): ReportId[] {
  if (hasPermissionInList(permissions, "reports:generate")) {
    return [...REPORT_IDS];
  }
  return REPORT_IDS.filter((id) => canAccessReport(permissions, id));
}
