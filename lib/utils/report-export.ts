/**
 * Report export: real .xlsx (SheetJS) and sectioned CSV.
 * Avoids blank/broken "Excel" files from merging heterogeneous rows into one CSV.
 */

import * as XLSX from "xlsx";

const META_KEYS = new Set([
  "reportId",
  "reportName",
  "period",
  "branchName",
  "generatedAt",
]);

function sanitizeForExcel(value: unknown): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toISOString();
  const s = String(value);
  // Excel treats leading = + - @ as formula / special; prefix with apostrophe for display
  if (/^[=+\-@]/.test(s)) return `'${s}`;
  return s;
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
  const start = p.startDate instanceof Date ? p.startDate.toISOString() : String(p.startDate ?? "");
  const end = p.endDate instanceof Date ? p.endDate.toISOString() : String(p.endDate ?? "");
  return { periodStart: start, periodEnd: end };
}

/**
 * Build worksheet payloads from server report data (summary + arrays of plain objects).
 */
export function buildReportSheets(data: Record<string, unknown>): {
  name: string;
  data: Record<string, unknown>[];
}[] {
  const sheets: { name: string; data: Record<string, unknown>[] }[] = [];

  const metaRow: Record<string, unknown> = {
    reportName: data.reportName ?? "",
    branchName: data.branchName ?? "",
    ...flattenPeriod(data.period),
    generatedAt:
      data.generatedAt instanceof Date
        ? data.generatedAt.toISOString()
        : String(data.generatedAt ?? ""),
  };
  sheets.push({ name: "Report", data: [metaRow] });

  if (data.summary && typeof data.summary === "object" && data.summary !== null) {
    sheets.push({
      name: "Summary",
      data: [data.summary as Record<string, unknown>],
    });
  }

  for (const [key, value] of Object.entries(data)) {
    if (META_KEYS.has(key) || key === "summary") continue;
    if (!Array.isArray(value)) continue;

    const rows =
      value.length > 0
        ? (value as Record<string, unknown>[])
        : [{ _note: "No rows for this period or filters." }];

    sheets.push({
      name: humanizeSheetName(key),
      data: rows,
    });
  }

  return sheets;
}

function objectToMatrix(rows: Record<string, unknown>[]): (string | number)[][] {
  if (rows.length === 0) return [["(empty)"]];

  const keySet = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((k) => keySet.add(k));
  }
  const keys = [...keySet].sort((a, b) => a.localeCompare(b));

  const header = keys.map((k) =>
    k
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase())
      .trim()
  );

  const dataRows = rows.map((row) =>
    keys.map((k) => sanitizeForExcel(row[k]))
  );

  return [header, ...dataRows];
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

/** Download multi-sheet .xlsx from report server payload. */
export function downloadReportXLSX(data: Record<string, unknown>, filenameBase: string): void {
  const sheets = buildReportSheets(data);
  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const { name, data: rows } of sheets) {
    const matrix = objectToMatrix(rows);
    const ws = XLSX.utils.aoa_to_sheet(matrix);
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

/**
 * Single UTF-8 CSV file with explicit sections (Excel opens cleanly; no fake formulas).
 */
export function downloadReportCSV(data: Record<string, unknown>, filenameBase: string): void {
  const sheets = buildReportSheets(data);
  const parts: string[] = [];

  for (const { name, data: rows } of sheets) {
    parts.push(`### ${name}`);
    const matrix = objectToMatrix(rows);
    parts.push(matrixToCsv(matrix));
    parts.push("");
  }

  const csv = "\ufeff" + parts.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filenameBase}.csv`);
}
