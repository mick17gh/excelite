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

/** One row = one option under a group for an existing menu item (matched by product SKU). */
export interface BulkMenuOptionRow {
  menuItemSku: string;
  groupName: string;
  optionName: string;
  groupSortOrder?: number;
  isRequired?: boolean;
  minSelections?: number;
  maxSelections?: number;
  optionSortOrder?: number;
  priceDelta?: number;
  optionSku?: string;
  costDelta?: number;
  isDefault?: boolean;
}

export function parseMenuOptionsCSV(rows: ParsedCSVRow[]): BulkMenuOptionRow[] {
  return rows
    .map((row) => {
      const menuItemSku = (
        row.menuItemSku ||
        row.menu_sku ||
        row.productSku ||
        row.product_sku ||
        row.parentSku ||
        row.ParentSku ||
        ""
      ).trim();
      const groupName = (row.groupName || row.group || row.Group || "").trim();
      const optionName = (row.optionName || row.option || row.Option || "").trim();
      const parseNum = (v: string | undefined, fallback: number | undefined) => {
        if (v === undefined || v === "") return fallback;
        const n = parseFloat(String(v));
        return Number.isFinite(n) ? n : fallback;
      };
      const parseIntRow = (v: string | undefined, fallback: number | undefined) => {
        if (v === undefined || v === "") return fallback;
        const n = parseInt(String(v), 10);
        return Number.isFinite(n) ? n : fallback;
      };
      return {
        menuItemSku,
        groupName,
        optionName,
        groupSortOrder: parseIntRow(row.groupSortOrder ?? row.group_sort, undefined),
        isRequired:
          String(row.isRequired ?? row.required ?? "true").toLowerCase() === "false"
            ? false
            : true,
        minSelections: parseIntRow(row.minSelections ?? row.min_sel, undefined),
        maxSelections: parseIntRow(row.maxSelections ?? row.max_sel, undefined),
        optionSortOrder: parseIntRow(row.optionSortOrder ?? row.option_sort, undefined),
        priceDelta: parseNum(row.priceDelta ?? row.PriceDelta, 0),
        optionSku: (row.optionSku || row.option_sku || row.OptionSku || "").trim() || undefined,
        costDelta: (() => {
          const raw = row.costDelta ?? row.CostDelta;
          if (raw === undefined || raw === "") return undefined;
          const n = parseFloat(String(raw));
          return Number.isFinite(n) ? n : undefined;
        })(),
        isDefault: String(row.isDefault ?? "false").toLowerCase() === "true",
      };
    })
    .filter((r) => r.menuItemSku && r.groupName && r.optionName);
}

export function getMenuOptionsCSVTemplate(): string {
  const headers = [
    "menuItemSku",
    "groupName",
    "optionName",
    "priceDelta",
    "optionSku",
    "groupSortOrder",
    "optionSortOrder",
    "minSelections",
    "maxSelections",
    "isRequired",
    "isDefault",
    "costDelta",
  ];
  const example = ["GC-001", "Size", "Large", "2.50", "OPT-LG", "0", "0", "1", "1", "true", "false", ""];
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

import type { UnitType } from "@/lib/generated/prisma/client";

export interface BulkWarehouseItemInput {
  name: string;
  sku: string;
  categoryId: string;
  unit: UnitType;
  unitCost: number;
  currentStock?: number;
  minStock?: number;
  reorderPoint?: number;
  maxStock?: number | null;
  itemStage?: "RAW" | "PROCESSED" | "BRANCH_READY";
  requiresCommissaryProcessing?: boolean;
  allowDirectToBranch?: boolean;
  isActive?: boolean;
}

export function parseWarehouseCSV(rows: ParsedCSVRow[]): BulkWarehouseItemInput[] {
  const parseBool = (v: string | undefined, fallback: boolean): boolean => {
    if (v == null || String(v).trim() === "") return fallback;
    const s = String(v).trim().toLowerCase();
    if (["true", "t", "yes", "y", "1"].includes(s)) return true;
    if (["false", "f", "no", "n", "0"].includes(s)) return false;
    return fallback;
  };

  const parseNum = (v: string | undefined): number | undefined => {
    if (v == null || String(v).trim() === "") return undefined;
    const n = parseFloat(String(v));
    return Number.isFinite(n) ? n : undefined;
  };

  const normalizeStage = (v: string | undefined): BulkWarehouseItemInput["itemStage"] => {
    if (v == null || String(v).trim() === "") return undefined;
    const s = String(v).trim().toUpperCase();
    if (s === "RAW") return "RAW";
    if (s === "PROCESSED") return "PROCESSED";
    if (s === "BRANCH_READY" || s === "BRANCH-READY" || s === "BRANCH READY") {
      return "BRANCH_READY";
    }
    return undefined;
  };

  return rows
    .map((row) => ({
      name: row.name || row.Name || "",
      sku: row.sku || row.SKU || "",
      categoryId:
        row.categoryId || row.CategoryId || row.category || row.Category || "",
      unit: (row.unit || row.Unit || "UNIT") as UnitType,
      unitCost: parseFloat(row.unitCost || row["Unit Cost"] || row.cost || "0"),
      currentStock: parseNum(row.currentStock || row["Current Stock"]),
      minStock: parseNum(row.minStock || row["Min Stock"]),
      reorderPoint: parseNum(row.reorderPoint || row["Reorder Point"]),
      maxStock: parseNum(row.maxStock || row["Max Stock"]),
      itemStage: normalizeStage(row.itemStage || row.stage || row.Stage || row["Item Stage"]),
      requiresCommissaryProcessing: parseBool(
        row.requiresCommissaryProcessing ||
          row["Requires Commissary Processing"] ||
          row.commissaryProcessing ||
          row["Commissary Processing"],
        false,
      ),
      allowDirectToBranch: parseBool(
        row.allowDirectToBranch || row["Allow Direct To Branch"] || row.directToBranch,
        true,
      ),
      isActive: parseBool(row.isActive || row.Active, true),
    }))
    .filter((item) => item.name && item.sku);
}

export function getWarehouseCSVTemplate(): string {
  const headers = [
    "name",
    "sku",
    "category",
    "unit",
    "unitCost",
    "currentStock",
    "minStock",
    "reorderPoint",
    "maxStock",
    "itemStage",
    "requiresCommissaryProcessing",
    "allowDirectToBranch",
    "isActive",
  ];
  const examples = [
    [
      "Chicken Breast",
      "CHKN-001",
      "FOOD",
      "KG",
      "15.50",
      "100",
      "20",
      "30",
      "75",
      "RAW",
      "false",
      "true",
      "true",
    ],
    [
      "Rice",
      "RICE-001",
      "FOOD",
      "KG",
      "5.00",
      "500",
      "100",
      "150",
      "",
      "RAW",
      "false",
      "true",
      "true",
    ],
    [
      "Cooking Oil",
      "OIL-001",
      "FOOD",
      "LITER",
      "12.00",
      "50",
      "10",
      "20",
      "100",
      "RAW",
      "false",
      "true",
      "true",
    ],
    [
      "Soft Drinks",
      "DRK-001",
      "BEVERAGE",
      "CASE",
      "10.00",
      "120",
      "30",
      "50",
      "250",
      "BRANCH_READY",
      "false",
      "true",
      "true",
    ],
    [
      "Plastic Cups",
      "CUP-001",
      "PACKAGING",
      "PACK",
      "8.00",
      "200",
      "50",
      "80",
      "400",
      "RAW",
      "false",
      "true",
      "true",
    ],
    [
      "Detergent",
      "CLN-001",
      "CLEANING",
      "PIECE",
      "5.00",
      "30",
      "10",
      "15",
      "",
      "RAW",
      "false",
      "true",
      "true",
    ],
  ];
  const notes = [
    "# --- Reference (rows below are ignored on import) ---",
    "# Columns: name, sku, category, unit, unitCost, currentStock, minStock, reorderPoint, maxStock, itemStage, requiresCommissaryProcessing, allowDirectToBranch, isActive",
    "# maxStock: branch par level when sending to branches (optional; blank uses 5x reorder point on transfer)",
    "# Category can be categoryId, code, or name from Inventory Categories setup",
    "# Valid units: KG, GRAM, MG, TON, LITER, ML, CL, GALLON, PIECE, UNIT, ITEM, BOX, CARTON, CASE, PACK, BAG, SACK, CRATE, TRAY, BOTTLE, CAN, JAR, CUP, TABLESPOON, TEASPOON, SLICE, PORTION, SERVING, PLATE",
    "# Valid itemStage: RAW, PROCESSED, BRANCH_READY",
    "# Booleans (requiresCommissaryProcessing, allowDirectToBranch, isActive): true/false (also yes/no, 1/0)",
  ];
  return [headers.join(","), ...examples.map((e) => e.join(",")), "", ...notes].join("\n");
}
