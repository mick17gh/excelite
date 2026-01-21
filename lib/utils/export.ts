/**
 * Export utilities for CSV and Excel data export
 */

export interface ExportableData {
  [key: string]: string | number | Date | boolean | null | undefined;
}

/**
 * Convert data to CSV format
 */
export function convertToCSV(data: ExportableData[], headers?: string[]): string {
  if (data.length === 0) return "";

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create CSV header row with readable names
  const headerRow = csvHeaders
    .map((h) => formatHeaderName(h))
    .join(",");
  
  // Create CSV data rows
  const dataRows = data.map((row) => {
    return csvHeaders
      .map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        if (value instanceof Date) {
          return `"${value.toISOString()}"`;
        }
        if (typeof value === "boolean") {
          return value ? "Yes" : "No";
        }
        // Escape quotes and wrap in quotes if contains comma or newline
        const stringValue = String(value);
        if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",");
  });
  
  return [headerRow, ...dataRows].join("\n");
}

/**
 * Format header name to be more readable
 */
function formatHeaderName(header: string): string {
  return header
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Download data as CSV file
 */
export function downloadCSV(
  data: ExportableData[],
  filename: string,
  headers?: string[]
): void {
  const csv = convertToCSV(data, headers);
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export data to CSV (alias for downloadCSV with Record type)
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string
): void {
  const exportableData = data.map((row) => {
    const flatRow: ExportableData = {};
    Object.entries(row).forEach(([key, value]) => {
      if (value !== null && typeof value === "object" && !(value instanceof Date)) {
        // Flatten nested objects
        Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) => {
          flatRow[`${key}_${nestedKey}`] = nestedValue as string | number | Date | boolean | null | undefined;
        });
      } else {
        flatRow[key] = value as string | number | Date | boolean | null | undefined;
      }
    });
    return flatRow;
  });
  downloadCSV(exportableData, filename);
}

/**
 * Export data to Excel-compatible format (CSV with multiple sheets as separate files or single XLSX)
 */
export function exportToExcel(
  sheets: { name: string; data: Record<string, unknown>[] }[],
  filename: string
): void {
  // For a true Excel file, you'd use a library like xlsx or exceljs
  // This creates a multi-sheet compatible format using CSV
  
  if (sheets.length === 1) {
    // Single sheet - just export as CSV
    exportToCSV(sheets[0].data, filename);
    return;
  }

  // Multiple sheets - create a combined format
  // In production, use xlsx library for proper .xlsx files
  const allData: Record<string, unknown>[] = [];
  
  sheets.forEach((sheet) => {
    // Add sheet header
    allData.push({ "--- Sheet": sheet.name, "---": "" });
    
    // Add data
    sheet.data.forEach((row) => {
      allData.push(row);
    });
    
    // Add blank row between sheets
    allData.push({});
  });

  exportToCSV(allData, filename);
}

/**
 * Download a blob as a file
 */
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

/**
 * Format date for filename
 */
export function formatDateForFilename(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

/**
 * Export transactions data
 */
export function exportTransactions(
  transactions: {
    id: string;
    date: Date;
    type: string;
    amount: number;
    reference?: string;
    status: string;
  }[],
  filename: string
): void {
  const data = transactions.map((t) => ({
    id: t.id,
    date: t.date,
    type: t.type,
    amount: t.amount,
    reference: t.reference || "",
    status: t.status,
  }));
  downloadCSV(data, filename);
}

/**
 * Export inventory data
 */
export function exportInventory(
  items: {
    name: string;
    sku: string;
    category: string;
    currentStock: number;
    unit: string;
    unitCost: number;
    totalValue: number;
    branch: string;
    status: string;
  }[],
  filename: string
): void {
  downloadCSV(items, filename);
}

/**
 * Export staff data
 */
export function exportStaff(
  staff: {
    employeeId: string;
    name: string;
    role: string;
    branch: string;
    status: string;
    hireDate: Date;
  }[],
  filename: string
): void {
  downloadCSV(staff, filename);
}

/**
 * Export sales data
 */
export function exportSales(
  sales: {
    date: Date;
    orderNumber: string;
    branch: string;
    channel: string;
    items: number;
    subtotal: number;
    tax: number;
    total: number;
  }[],
  filename: string
): void {
  downloadCSV(sales, filename);
}
