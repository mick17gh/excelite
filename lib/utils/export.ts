/**
 * Export utilities for CSV and data export
 */

export interface ExportableData {
  [key: string]: string | number | Date | null | undefined;
}

/**
 * Convert data to CSV format
 */
export function convertToCSV(data: ExportableData[], headers?: string[]): string {
  if (data.length === 0) return "";

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create CSV header row
  const headerRow = csvHeaders.join(",");
  
  // Create CSV data rows
  const dataRows = data.map((row) => {
    return csvHeaders
      .map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        if (value instanceof Date) {
          return `"${value.toISOString()}"`;
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
 * Download data as CSV file
 */
export function downloadCSV(
  data: ExportableData[],
  filename: string,
  headers?: string[]
): void {
  const csv = convertToCSV(data, headers);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
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
