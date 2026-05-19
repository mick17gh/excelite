/**
 * Report export: real .xlsx (SheetJS) and sectioned CSV.
 */

import * as XLSX from "xlsx";
import { formatReportDate } from "@/lib/reports/formatters";
import { getReportExportConfig } from "@/lib/reports/sheet-config";

const META_KEYS = new Set([
  "reportId",
  "reportName",
  "period",
  "branchName",
  "generatedAt",
  "primaryDataKey",
  "primarySheetName",
]);

const DATE_LIKE_KEYS = /date|time|at$/i;

function sanitizeForExcel(value: unknown, key?: string): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return formatReportDate(value);
  if (typeof value === "string") {
    if (key && DATE_LIKE_KEYS.test(key) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return formatReportDate(parsed);
    }
    if (/^[=+\-@]/.test(value)) return `'${value}`;
    return value;
  }
  return String(value);
}

function humanizeSheetName(key: string): string {
  const base = key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
  const safe = base.replace(/[:\\/?*[\]]/g, "_").slice(0, 31);
  return safe || "Sheet";
}

function flattenPeriod(period: unknown): Record<string, string> {
  if (!period || typeof period !== "object") return {};
  const p = period as { startDate?: unknown; endDate?: unknown };
  const start =
    p.startDate instanceof Date
      ? formatReportDate(p.startDate)
      : String(p.startDate ?? "");
  const end =
    p.endDate instanceof Date ? formatReportDate(p.endDate) : String(p.endDate ?? "");
  return { periodStart: start, periodEnd: end };
}

export function buildReportSheets(data: Record<string, unknown>): {
  name: string;
  data: Record<string, unknown>[];
  freezeHeader?: boolean;
}[] {
  const reportId = String(data.reportId ?? "");
  const config = getReportExportConfig(reportId);
  const primaryKey =
    (data.primaryDataKey as string) || config?.primaryDataKey;
  const primaryName =
    (data.primarySheetName as string) || config?.primarySheetName;

  const sheets: { name: string; data: Record<string, unknown>[]; freezeHeader?: boolean }[] =
    [];

  if (primaryKey && Array.isArray(data[primaryKey])) {
    const rows = data[primaryKey] as Record<string, unknown>[];
    sheets.push({
      name: primaryName || humanizeSheetName(primaryKey),
      data: rows.length > 0 ? rows : [{ Note: "No rows for this period or filters." }],
      freezeHeader: true,
    });
  }

  if (data.summary && typeof data.summary === "object" && data.summary !== null) {
    sheets.push({
      name: "Summary",
      data: [data.summary as Record<string, unknown>],
      freezeHeader: true,
    });
  }

  for (const [key, value] of Object.entries(data)) {
    if (META_KEYS.has(key) || key === "summary" || key === primaryKey) continue;
    if (!Array.isArray(value)) continue;

    const rows =
      value.length > 0
        ? (value as Record<string, unknown>[])
        : [{ Note: "No rows for this period or filters." }];

    sheets.push({
      name: humanizeSheetName(key),
      data: rows,
      freezeHeader: true,
    });
  }

  if (sheets.length === 0) {
    const metaRow: Record<string, unknown> = {
      reportName: data.reportName ?? "",
      branchName: data.branchName ?? "",
      ...flattenPeriod(data.period),
      generatedAt:
        data.generatedAt instanceof Date
          ? formatReportDate(data.generatedAt)
          : String(data.generatedAt ?? ""),
    };
    sheets.push({ name: "Report", data: [metaRow], freezeHeader: true });
  }

  return sheets;
}

function objectToMatrix(rows: Record<string, unknown>[]): (string | number)[][] {
  if (rows.length === 0) return [["(empty)"]];

  const keys = Object.keys(rows[0]);
  const header = keys;
  const dataRows = rows.map((row) => keys.map((k) => sanitizeForExcel(row[k], k)));
  return [header, ...dataRows];
}

function applyFreezePane(ws: XLSX.WorkSheet): void {
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };
}

function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadReportXLSX(data: Record<string, unknown>, filenameBase: string): void {
  const sheets = buildReportSheets(data);
  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const { name, data: rows, freezeHeader } of sheets) {
    const matrix = objectToMatrix(rows);
    const ws = XLSX.utils.aoa_to_sheet(matrix);
    if (freezeHeader && matrix.length > 1) {
      applyFreezePane(ws);
    }
    let sheetName = name.slice(0, 31);
    let n = 2;
    while (usedNames.has(sheetName)) {
      const suffix = `_${n}`;
      sheetName = `${name.slice(0, 31 - suffix.length)}${suffix}`;
      n += 1;
    }
    usedNames.add(sheetName);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `${filenameBase}.xlsx`);
}

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function matrixToCsv(matrix: (string | number)[][]): string {
  return matrix
    .map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(","))
    .join("\n");
}

export function downloadReportCSV(data: Record<string, unknown>, filenameBase: string): void {
  const sheets = buildReportSheets(data);
  const parts: string[] = [];

  for (const { name, data: rows } of sheets) {
    parts.push(`### ${name}`);
    parts.push(matrixToCsv(objectToMatrix(rows)));
    parts.push("");
  }

  const csv = "\ufeff" + parts.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filenameBase}.csv`);
}
