// Bulk import parsing and template utilities
// These are client-side utilities, not server actions

export interface ParsedCSVRow {
  [key: string]: string;
}

// =====================================
// MENU UTILITIES
// =====================================

export interface BulkMenuItemInput {
  name: string;
  sku?: string;
  categoryId: string;
  price: number;
  cost?: number;
  description?: string;
  isActive?: boolean;
}

export function parseMenuCSV(rows: ParsedCSVRow[]): BulkMenuItemInput[] {
  return rows.map((row) => ({
    name: row.name || row.Name || "",
    sku: row.sku || row.SKU || undefined,
    categoryId: row.categoryId || row.CategoryId || row.category || row.Category || "",
    price: parseFloat(row.price || row.Price || "0"),
    cost: row.cost || row.Cost ? parseFloat(row.cost || row.Cost) : undefined,
    description: row.description || row.Description || undefined,
    isActive: row.isActive === "false" ? false : true,
  })).filter((item) => item.name && item.price > 0 && item.categoryId);
}

export function getMenuCSVTemplate(): string {
  const headers = ["name", "sku", "category", "price", "cost", "description", "isActive"];
  const example = ["Grilled Chicken", "GC-001", "Main Course", "25.99", "12.50", "Delicious grilled chicken breast", "true"];
  return [headers.join(","), example.join(",")].join("\n");
}

// =====================================
// INVENTORY UTILITIES
// =====================================

export interface BulkInventoryItemInput {
  name: string;
  sku?: string;
  category: string;
  unit: string;
  unitCost: number;
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  branchId: string;
}

export function parseInventoryCSV(rows: ParsedCSVRow[], defaultBranchId: string): BulkInventoryItemInput[] {
  return rows.map((row) => ({
    name: row.name || row.Name || "",
    sku: row.sku || row.SKU || undefined,
    category: row.category || row.Category || "FOOD",
    unit: row.unit || row.Unit || "UNIT",
    unitCost: parseFloat(row.unitCost || row["Unit Cost"] || row.cost || "0"),
    currentStock: row.currentStock || row["Current Stock"]
      ? parseFloat(row.currentStock || row["Current Stock"])
      : undefined,
    minStock: row.minStock || row["Min Stock"]
      ? parseFloat(row.minStock || row["Min Stock"])
      : undefined,
    maxStock: row.maxStock || row["Max Stock"]
      ? parseFloat(row.maxStock || row["Max Stock"])
      : undefined,
    reorderPoint: row.reorderPoint || row["Reorder Point"]
      ? parseFloat(row.reorderPoint || row["Reorder Point"])
      : undefined,
    branchId: row.branchId || row["Branch ID"] || defaultBranchId,
  })).filter((item) => item.name && item.branchId);
}

export function getInventoryCSVTemplate(): string {
  const headers = ["name", "sku", "category", "unit", "unitCost", "currentStock", "minStock", "maxStock", "reorderPoint"];
  const example = ["Chicken Breast", "CB-001", "FOOD", "KG", "8.50", "50", "10", "100", "20"];
  return [headers.join(","), example.join(",")].join("\n");
}

// =====================================
// CATEGORY UTILITIES
// =====================================

export interface BulkCategoryInput {
  name: string;
  description?: string;
}

export function parseCategoryCSV(rows: ParsedCSVRow[]): BulkCategoryInput[] {
  return rows
    .map((row) => ({
      name: row.name || row.Name || "",
      description: row.description || row.Description || undefined,
    }))
    .filter((item) => item.name.trim().length > 0);
}

export function getCategoryCSVTemplate(): string {
  const headers = ["name", "description"];
  const examples = [
    ["Main Course", "Primary dishes and entrees"],
    ["Appetizers", "Starters and small plates"],
    ["Desserts", "Sweet treats and desserts"],
    ["Beverages", "Drinks and refreshments"],
  ];
  return [headers.join(","), ...examples.map((e) => e.join(","))].join("\n");
}

// =====================================
// SUPPLIER UTILITIES
// =====================================

export interface BulkSupplierInput {
  name: string;
  code?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export function parseSupplierCSV(rows: ParsedCSVRow[]): BulkSupplierInput[] {
  return rows
    .map((row) => ({
      name: row.name || row.Name || "",
      code: row.code || row.Code || undefined,
      contactName: row.contactName || row["Contact Name"] || row.contact || undefined,
      email: row.email || row.Email || undefined,
      phone: row.phone || row.Phone || undefined,
      address: row.address || row.Address || undefined,
    }))
    .filter((item) => item.name.trim().length > 0);
}

export function getSupplierCSVTemplate(): string {
  const headers = ["name", "code", "contactName", "email", "phone", "address"];
  const examples = [
    ["Fresh Farms Ltd", "SUP-001", "John Smith", "john@freshfarms.com", "+233 20 123 4567", "123 Main Street, Accra"],
    ["Ocean Seafood", "SUP-002", "Mary Johnson", "mary@oceanseafood.com", "+233 24 765 4321", "45 Harbor Road, Tema"],
  ];
  return [headers.join(","), ...examples.map((e) => e.join(","))].join("\n");
}

// =====================================
// STAFF UTILITIES
// =====================================

export interface BulkStaffInput {
  employeeId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: string;
  hourlyRate: number;
  branchId: string;
}

export function parseStaffCSV(rows: ParsedCSVRow[], defaultBranchId: string): BulkStaffInput[] {
  return rows
    .map((row) => ({
      employeeId: row.employeeId || row["Employee ID"] || undefined,
      firstName: row.firstName || row["First Name"] || "",
      lastName: row.lastName || row["Last Name"] || "",
      email: row.email || row.Email || undefined,
      phone: row.phone || row.Phone || undefined,
      role: row.role || row.Role || "SERVICE",
      hourlyRate: parseFloat(row.hourlyRate || row["Hourly Rate"] || "0"),
      branchId: row.branchId || row["Branch ID"] || defaultBranchId,
    }))
    .filter((item) => item.firstName.trim().length > 0 && item.lastName.trim().length > 0);
}

export function getStaffCSVTemplate(): string {
  const headers = ["employeeId", "firstName", "lastName", "email", "phone", "role", "hourlyRate"];
  const examples = [
    ["EMP-001", "John", "Doe", "john.doe@restaurant.com", "+233 20 111 2222", "MANAGER", "25.00"],
    ["EMP-002", "Jane", "Smith", "jane.smith@restaurant.com", "+233 24 333 4444", "KITCHEN", "15.00"],
    ["EMP-003", "Bob", "Wilson", "", "+233 50 555 6666", "SERVICE", "12.00"],
  ];
  return [headers.join(","), ...examples.map((e) => e.join(","))].join("\n");
}

// =====================================
// WAREHOUSE UTILITIES
// =====================================

import type { InventoryCategory, UnitType } from "@/lib/generated/prisma/client";

export interface BulkWarehouseItemInput {
  name: string;
  sku: string;
  category: InventoryCategory;
  unit: UnitType;
  unitCost: number;
  currentStock?: number;
  minStock?: number;
  reorderPoint?: number;
}

export function parseWarehouseCSV(rows: ParsedCSVRow[]): BulkWarehouseItemInput[] {
  return rows.map((row) => ({
    name: row.name || row.Name || "",
    sku: row.sku || row.SKU || "",
    category: (row.category || row.Category || "FOOD") as InventoryCategory,
    unit: (row.unit || row.Unit || "UNIT") as UnitType,
    unitCost: parseFloat(row.unitCost || row["Unit Cost"] || row.cost || "0"),
    currentStock: row.currentStock || row["Current Stock"]
      ? parseFloat(row.currentStock || row["Current Stock"])
      : undefined,
    minStock: row.minStock || row["Min Stock"]
      ? parseFloat(row.minStock || row["Min Stock"])
      : undefined,
    reorderPoint: row.reorderPoint || row["Reorder Point"]
      ? parseFloat(row.reorderPoint || row["Reorder Point"])
      : undefined,
  })).filter((item) => item.name && item.sku);
}

export function getWarehouseCSVTemplate(): string {
  const headers = ["name", "sku", "category", "unit", "unitCost", "currentStock", "minStock", "reorderPoint"];
  const examples = [
    ["Chicken Breast", "CHKN-001", "FOOD", "KG", "15.50", "100", "20", "30"],
    ["Rice", "RICE-001", "FOOD", "KG", "5.00", "500", "100", "150"],
    ["Cooking Oil", "OIL-001", "FOOD", "LITER", "12.00", "50", "10", "20"],
  ];
  return [headers.join(","), ...examples.map((e) => e.join(","))].join("\n");
}
