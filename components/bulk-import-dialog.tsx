"use client";

import { useState, useRef, useTransition, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  bulkCreateMenuItems,
  bulkUpsertMenuItemOptionGroups,
  bulkCreateInventoryItems,
  bulkCreateCategories,
  bulkCreateSuppliers,
  bulkCreateStaff,
} from "@/lib/actions/bulk";
import {
  parseMenuCSV,
  parseMenuOptionsCSV,
  parseInventoryCSV,
  parseCategoryCSV,
  parseSupplierCSV,
  parseStaffCSV,
  getMenuCSVTemplate,
  getMenuOptionsCSVTemplate,
  getInventoryCSVTemplate,
  getCategoryCSVTemplate,
  getSupplierCSVTemplate,
  getStaffCSVTemplate,
  menuVisibilityPreviewLabel,
  resolveStaffRoleCode,
  resolveInventoryUnit,
} from "@/lib/utils/bulk-import";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { staffJobRoleComboboxOptions } from "@/lib/staff/job-role-defaults";
import type { StaffJobRoleCategory } from "@/lib/generated/prisma/client";
import { resolveBranchRefsFromList } from "@/lib/menu/branch-availability";
import { UNIT_TYPES, UNIT_LABELS } from "@/lib/constants/units";
import type { UnitType } from "@/lib/generated/prisma/client";

type ImportType = "menu" | "menu-options" | "inventory" | "category" | "supplier" | "staff";

export interface StaffJobRoleImportOption {
  id: string;
  name: string;
  code: string;
  category: StaffJobRoleCategory | null;
}

export interface InventoryCategoryImportOption {
  id: string;
  name: string;
  code: string;
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ImportType;
  branches?: Array<{ id: string; name: string; code?: string }>;
  jobRoles?: StaffJobRoleImportOption[];
  inventoryCategories?: InventoryCategoryImportOption[];
  onSuccess?: () => void;
}

interface ParsedRow {
  data: Record<string, string | number | boolean | undefined>;
  errors: string[];
  isValid: boolean;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  type,
  branches = [],
  jobRoles = [],
  inventoryCategories = [],
  onSuccess,
}: BulkImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [importResult, setImportResult] = useState<{
    success: boolean;
    created?: number;
    updated?: number;
    errors?: string[];
  } | null>(null);

  const resetDialog = () => {
    setStep("upload");
    setParsedData([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetDialog();
    }
    onOpenChange(open);
  };

  const downloadTemplate = () => {
    let template: string;
    switch (type) {
      case "menu":
        template = getMenuCSVTemplate();
        break;
      case "menu-options":
        template = getMenuOptionsCSVTemplate();
        break;
      case "inventory":
        template = getInventoryCSVTemplate();
        break;
      case "category":
        template = getCategoryCSVTemplate();
        break;
      case "supplier":
        template = getSupplierCSVTemplate();
        break;
      case "staff":
        template = getStaffCSVTemplate(
          jobRoles.map((r) => ({
            code: r.code,
            name: r.name,
            category: r.category,
          })),
        );
        break;
      default:
        template = "";
    }
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${type}-import-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (content: string): Record<string, string>[] => {
    const lines = content
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
      if (values.length === headers.length) {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        rows.push(row);
      }
    }

    return rows;
  };

  const validateRow = (
    row: Record<string, string>,
    index: number,
  ): ParsedRow => {
    const errors: string[] = [];

    switch (type) {
      case "menu": {
        if (!row.name && !row.Name) errors.push("Name is required");
        const price = parseFloat(row.price || row.Price || "0");
        if (isNaN(price) || price <= 0) errors.push("Valid price is required");
        if (!row.category && !row.Category) errors.push("Category is required");
        const visibleRaw =
          row.visibleAtAllBranches ??
          row.allBranches ??
          row.visible_all_branches ??
          "";
        const allBranches =
          visibleRaw === "" ||
          ["true", "yes", "1", "y"].includes(visibleRaw.toLowerCase());
        if (!allBranches) {
          const branchList = (
            row.branches ||
            row.branchCodes ||
            row.visibleBranches ||
            ""
          )
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          if (branchList.length === 0) {
            errors.push("branches required when visibleAtAllBranches is false");
          } else if (branches.length > 0) {
            const resolved = resolveBranchRefsFromList(
              branchList,
              branches.map((b) => ({
                id: b.id,
                name: b.name,
                code: b.code ?? b.name,
              }))
            );
            if (!resolved.ok) errors.push(resolved.error);
          }
        }
        break;
      }
      case "menu-options": {
        const sku =
          row.menuItemSku ||
          row.menu_sku ||
          row.productSku ||
          row.product_sku ||
          row.parentSku;
        if (!sku?.trim()) errors.push("menuItemSku is required");
        if (!(row.groupName || row.group || row.Group)?.trim()) {
          errors.push("groupName is required");
        }
        if (!(row.optionName || row.option || row.Option)?.trim()) {
          errors.push("optionName is required");
        }
        break;
      }
      case "inventory": {
        if (!row.name && !row.Name) errors.push("Name is required");
        const unitCost = parseFloat(
          row.unitCost || row["Unit Cost"] || row.cost || "0",
        );
        if (isNaN(unitCost) || unitCost < 0)
          errors.push("Valid unit cost is required");

        const unitRaw = String(row.unit || row.Unit || "").trim();
        if (!unitRaw) {
          errors.push("Unit is required");
        } else if (!resolveInventoryUnit(unitRaw)) {
          errors.push("Select a valid unit");
        }

        const categoryRaw = String(row.category || row.Category || "").trim();
        if (!categoryRaw) {
          errors.push("Category is required");
        } else if (inventoryCategories.length > 0) {
          const key = categoryRaw.toLowerCase();
          const matched = inventoryCategories.some(
            (c) =>
              c.name.trim().toLowerCase() === key ||
              c.code.trim().toLowerCase() === key,
          );
          if (!matched) {
            errors.push("Select a valid inventory category");
          }
        }
        break;
      }
      case "category":
        if (!row.name && !row.Name) errors.push("Name is required");
        break;
      case "supplier":
        if (!row.name && !row.Name) errors.push("Name is required");
        break;
      case "staff": {
        if (!row.firstName && !row["First Name"])
          errors.push("First name is required");
        if (!row.lastName && !row["Last Name"])
          errors.push("Last name is required");
        const hourlyRate = parseFloat(
          row.hourlyRate || row["Hourly Rate"] || "0",
        );
        if (isNaN(hourlyRate) || hourlyRate < 0)
          errors.push("Valid hourly rate is required");
        const roleRaw = String(row.role || row.Role || "").trim();
        if (!roleRaw) {
          errors.push("Job role is required");
        } else if (
          jobRoles.length > 0 &&
          !resolveStaffRoleCode(roleRaw, jobRoles)
        ) {
          errors.push("Invalid role — select from dropdown");
        }
        break;
      }
    }

    return {
      data: row,
      errors,
      isValid: errors.length === 0,
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const rows = parseCSV(content);

      if (rows.length === 0) {
        toast.error("No valid data found in CSV");
        return;
      }

      const normalizedRows =
        type === "staff"
          ? rows.map((row) => normalizeStaffRow(row))
          : type === "inventory"
            ? rows.map((row) => normalizeInventoryRow(row))
            : rows;
      const validated = normalizedRows.map((row, index) => validateRow(row, index));
      setParsedData(validated);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const removeRow = (index: number) => {
    setParsedData((prev) => prev.filter((_, i) => i !== index));
  };

  const normalizeInventoryRow = (row: Record<string, string>): Record<string, string> => {
    const normalized = { ...row };
    if (!normalized.name && normalized.Name) normalized.name = normalized.Name;
    if (!normalized.sku && normalized.SKU) normalized.sku = normalized.SKU;
    if (!normalized.category && normalized.Category) {
      normalized.category = normalized.Category;
    }
    if (!normalized.unit && normalized.Unit) normalized.unit = normalized.Unit;
    if (!normalized.unitCost && (normalized["Unit Cost"] || normalized.cost)) {
      normalized.unitCost = normalized["Unit Cost"] || normalized.cost;
    }
    if (!normalized.currentStock && normalized["Current Stock"]) {
      normalized.currentStock = normalized["Current Stock"];
    }

    const unitResolved = resolveInventoryUnit(String(normalized.unit || ""));
    if (unitResolved) {
      normalized.unit = unitResolved;
      normalized.Unit = unitResolved;
    }

    const categoryRaw = String(normalized.category || "").trim();
    if (categoryRaw && inventoryCategories.length > 0) {
      const key = categoryRaw.toLowerCase();
      const match = inventoryCategories.find(
        (c) =>
          c.name.trim().toLowerCase() === key ||
          c.code.trim().toLowerCase() === key,
      );
      if (match) {
        normalized.category = match.name;
        normalized.Category = match.name;
      }
    }
    return normalized;
  };

  const normalizeStaffRow = (row: Record<string, string>): Record<string, string> => {
    const normalized = { ...row };
    if (!normalized.firstName && normalized["First Name"]) {
      normalized.firstName = normalized["First Name"];
    }
    if (!normalized.lastName && normalized["Last Name"]) {
      normalized.lastName = normalized["Last Name"];
    }
    if (!normalized.hourlyRate && normalized["Hourly Rate"]) {
      normalized.hourlyRate = normalized["Hourly Rate"];
    }
    const roleRaw = normalized.role || normalized.Role || "";
    if (roleRaw && jobRoles.length > 0) {
      const resolved = resolveStaffRoleCode(roleRaw, jobRoles);
      if (resolved) normalized.role = resolved;
    }
    return normalized;
  };

  const updateStaffRowField = (
    index: number,
    field: "firstName" | "lastName" | "role" | "hourlyRate" | "email" | "phone",
    value: string,
  ) => {
    setParsedData((prev) => {
      const updated = [...prev];
      const row = { ...(updated[index].data as Record<string, string>) };
      row[field] = value;
      if (field === "firstName") row["First Name"] = value;
      if (field === "lastName") row["Last Name"] = value;
      if (field === "hourlyRate") row["Hourly Rate"] = value;
      if (field === "role") row.Role = value;
      updated[index] = validateRow(row, index);
      return updated;
    });
  };

  const updateInventoryRowField = (
    index: number,
    field: "name" | "sku" | "category" | "unit" | "unitCost" | "currentStock",
    value: string,
  ) => {
    setParsedData((prev) => {
      const updated = [...prev];
      const row = { ...(updated[index].data as Record<string, string>) };
      row[field] = value;
      if (field === "name") row.Name = value;
      if (field === "sku") row.SKU = value;
      if (field === "category") row.Category = value;
      if (field === "unit") row.Unit = value;
      if (field === "unitCost") {
        row["Unit Cost"] = value;
        row.cost = value;
      }
      if (field === "currentStock") row["Current Stock"] = value;
      updated[index] = validateRow(row, index);
      return updated;
    });
  };

  const inventoryCategoryOptions = useMemo(
    () =>
      inventoryCategories.map((c) => ({
        value: c.name,
        label: c.code ? `${c.name} (${c.code})` : c.name,
      })),
    [inventoryCategories],
  );

  const inventoryUnitOptions = useMemo(
    () =>
      UNIT_TYPES.map((u) => ({
        value: u,
        label: UNIT_LABELS[u as UnitType] || u,
      })),
    [],
  );

  const jobRoleComboboxOptions = useMemo(
    () => staffJobRoleComboboxOptions(jobRoles, "code"),
    [jobRoles],
  );

  const handleImport = async () => {
    const validRows = parsedData.filter((r) => r.isValid);

    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    if ((type === "inventory" || type === "staff") && !selectedBranch) {
      toast.error("Please select a branch");
      return;
    }

    startTransition(async () => {
      try {
        let result;
        const rowData = validRows.map((r) => r.data as Record<string, string>);

        switch (type) {
          case "menu":
            result = await bulkCreateMenuItems(parseMenuCSV(rowData));
            break;
          case "menu-options":
            result = await bulkUpsertMenuItemOptionGroups(parseMenuOptionsCSV(rowData));
            break;
          case "inventory":
            result = await bulkCreateInventoryItems(
              parseInventoryCSV(rowData, selectedBranch),
            );
            break;
          case "category":
            result = await bulkCreateCategories(parseCategoryCSV(rowData));
            break;
          case "supplier":
            result = await bulkCreateSuppliers(parseSupplierCSV(rowData));
            break;
          case "staff":
            result = await bulkCreateStaff(
              parseStaffCSV(rowData, selectedBranch),
            );
            break;
          default:
            result = { success: false, error: "Unknown import type" };
        }

        if (result.success) {
          if ("created" in result && result.created != null) {
            setImportResult({ success: true, created: result.created });
          } else if ("updated" in result && result.updated != null) {
            setImportResult({ success: true, updated: result.updated });
          } else {
            setImportResult({ success: true });
          }
          setStep("result");
          onSuccess?.();
        } else {
          setImportResult({
            success: false,
            errors: [result.error || "Import failed"],
          });
          setStep("result");
        }
      } catch (error) {
        console.error("Import error:", error);
        setImportResult({
          success: false,
          errors: ["An unexpected error occurred"],
        });
        setStep("result");
      }
    });
  };

  const validCount = parsedData.filter((r) => r.isValid).length;
  const invalidCount = parsedData.filter((r) => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "max-h-[85vh] flex flex-col overflow-hidden",
          type === "staff" || type === "inventory" ? "max-w-6xl" : "max-w-3xl",
        )}
      >
        <DialogHeader>
          <DialogTitle>
            Import{" "}
            {type === "menu"
              ? "Products"
              : type === "menu-options"
                ? "Product options"
                : type === "inventory"
                  ? "Inventory Items"
                  : type === "category"
                    ? "Categories"
                    : type === "supplier"
                      ? "Suppliers"
                      : "Staff Members"}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import{" "}
            {type === "menu"
              ? "Products"
              : type === "menu-options"
                ? "option groups for existing products (matched by menu SKU)"
                : type === "inventory"
                  ? "inventory items"
                  : type === "category"
                    ? "categories"
                    : type === "supplier"
                      ? "suppliers"
                      : "staff members"}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-6 py-4">
            <div className="flex justify-center">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>

            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="flex flex-col items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Click to upload CSV file</p>
                  <p className="text-sm text-muted-foreground">
                    or drag and drop
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <FileSpreadsheet className="h-4 w-4" />
                CSV Format
              </h4>
              <p className="text-sm text-muted-foreground">
                {type === "menu" && (
                  <>
                    Required: <code>name</code>, <code>category</code>,{" "}
                    <code>price</code>. Optional: <code>sku</code>,{" "}
                    <code>cost</code>, <code>description</code>,{" "}
                    <code>isActive</code>, <code>visibleAtAllBranches</code>,{" "}
                    <code>branches</code> (branch codes/names when not all
                    branches)
                  </>
                )}
                {type === "menu-options" && (
                  <>
                    Required: <code>menuItemSku</code>, <code>groupName</code>,{" "}
                    <code>optionName</code>. Optional: <code>priceDelta</code>,{" "}
                    <code>optionSku</code>, <code>groupSortOrder</code>,{" "}
                    <code>optionSortOrder</code>, <code>minSelections</code>,{" "}
                    <code>maxSelections</code>, <code>isRequired</code>,{" "}
                    <code>isDefault</code>, <code>costDelta</code>
                  </>
                )}
                {type === "inventory" && (
                  <>
                    Required: <code>name</code>, <code>category</code> (must
                    match an inventory category name or code), <code>unit</code>
                    , <code>unitCost</code>. Optional: <code>sku</code>,{" "}
                    <code>currentStock</code>, <code>minStock</code>,{" "}
                    <code>maxStock</code>. Fix category and unit inline in the
                    preview step before importing.
                  </>
                )}
                {type === "category" && (
                  <>
                    Required: <code>name</code>. Optional:{" "}
                    <code>description</code>
                  </>
                )}
                {type === "supplier" && (
                  <>
                    Required: <code>name</code>. Optional: <code>code</code>,{" "}
                    <code>contactName</code>, <code>email</code>,{" "}
                    <code>phone</code>, <code>address</code>
                  </>
                )}
                {type === "staff" && (
                  <>
                    Required: <code>firstName</code>, <code>lastName</code>,{" "}
                    <code>hourlyRate</code>, <code>role</code> (job role code from
                    Settings → Job Roles). Optional: <code>employeeId</code>,{" "}
                    <code>email</code>, <code>phone</code>. You can fix roles and
                    other fields inline in the preview step.
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden py-4">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="outline" className="gap-1 text-destructive">
                    <XCircle className="h-3 w-3" />
                    {invalidCount} invalid
                  </Badge>
                )}
              </div>
              {(type === "inventory" || type === "staff") && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Branch:</Label>
                  <Combobox
                    options={branches.map((branch) => ({
                      value: branch.id,
                      label: branch.name,
                    }))}
                    value={selectedBranch}
                    onValueChange={setSelectedBranch}
                    placeholder="Select branch..."
                    searchPlaceholder="Search branches..."
                    emptyText="No branches found."
                    className="h-8 min-h-8 w-48 text-xs"
                  />
                </div>
              )}
            </div>

            <ScrollArea
              className="flex-1 border rounded-lg overflow-auto"
              style={{ maxHeight: "calc(85vh - 280px)" }}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>
                      {type === "staff"
                        ? "Name"
                        : type === "menu-options"
                          ? "Product SKU"
                          : "Name"}
                    </TableHead>
                    {type === "menu" && (
                      <>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Visibility</TableHead>
                      </>
                    )}
                    {type === "menu-options" && (
                      <>
                        <TableHead>Group</TableHead>
                        <TableHead>Option</TableHead>
                        <TableHead>Price Δ</TableHead>
                      </>
                    )}
                    {type === "inventory" && (
                      <>
                        <TableHead>Category</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Unit Cost</TableHead>
                      </>
                    )}
                    {type === "category" && <TableHead>Description</TableHead>}
                    {type === "supplier" && (
                      <>
                        <TableHead>Code</TableHead>
                        <TableHead>Contact</TableHead>
                      </>
                    )}
                    {type === "staff" && (
                      <>
                        <TableHead>Role</TableHead>
                        <TableHead>Hourly Rate</TableHead>
                      </>
                    )}
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row, index) => (
                    <TableRow
                      key={index}
                      className={!row.isValid ? "bg-destructive/5" : ""}
                    >
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {type === "staff" ? (
                          <div className="flex flex-col gap-1 min-w-[140px]">
                            <Input
                              className="h-7 text-xs"
                              value={String(
                                row.data.firstName || row.data["First Name"] || "",
                              )}
                              placeholder="First name"
                              onChange={(e) =>
                                updateStaffRowField(index, "firstName", e.target.value)
                              }
                            />
                            <Input
                              className="h-7 text-xs"
                              value={String(
                                row.data.lastName || row.data["Last Name"] || "",
                              )}
                              placeholder="Last name"
                              onChange={(e) =>
                                updateStaffRowField(index, "lastName", e.target.value)
                              }
                            />
                          </div>
                        ) : type === "inventory" ? (
                          <Input
                            className="h-8 text-xs min-w-[140px]"
                            value={String(row.data.name || row.data.Name || "")}
                            placeholder="Item name"
                            onChange={(e) =>
                              updateInventoryRowField(index, "name", e.target.value)
                            }
                          />
                        ) : type === "menu-options"
                            ? String(
                                row.data.menuItemSku ||
                                  row.data.menu_sku ||
                                  row.data.productSku ||
                                  "-",
                              )
                            : String(row.data.name || row.data.Name || "-")}
                      </TableCell>
                      {type === "menu" && (
                        <>
                          <TableCell>
                            {String(
                              row.data.category || row.data.Category || "-",
                            )}
                          </TableCell>
                          <TableCell>
                            {String(row.data.price || row.data.Price || "-")}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const parsed = parseMenuCSV([row.data as Record<string, string>]);
                              const item = parsed[0];
                              return item
                                ? menuVisibilityPreviewLabel(item)
                                : "-";
                            })()}
                          </TableCell>
                        </>
                      )}
                      {type === "menu-options" && (
                        <>
                          <TableCell>
                            {String(row.data.groupName || row.data.group || row.data.Group || "-")}
                          </TableCell>
                          <TableCell>
                            {String(row.data.optionName || row.data.option || row.data.Option || "-")}
                          </TableCell>
                          <TableCell>
                            {String(row.data.priceDelta ?? row.data.PriceDelta ?? "-")}
                          </TableCell>
                        </>
                      )}
                      {type === "inventory" && (
                        <>
                          <TableCell>
                            <Combobox
                              options={inventoryCategoryOptions}
                              value={String(
                                row.data.category || row.data.Category || "",
                              )}
                              onValueChange={(value) =>
                                updateInventoryRowField(index, "category", value)
                              }
                              placeholder="Select category..."
                              searchPlaceholder="Search categories..."
                              emptyText="No categories found."
                              className={cn(
                                "h-8 min-h-8 min-w-[160px] text-xs",
                                row.errors.some((e) =>
                                  e.toLowerCase().includes("category"),
                                ) && "border-destructive",
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Combobox
                              options={inventoryUnitOptions}
                              value={String(row.data.unit || row.data.Unit || "")}
                              onValueChange={(value) =>
                                updateInventoryRowField(index, "unit", value)
                              }
                              placeholder="Select unit..."
                              searchPlaceholder="Search units..."
                              emptyText="No units found."
                              className={cn(
                                "h-8 min-h-8 min-w-[140px] text-xs",
                                row.errors.some((e) =>
                                  e.toLowerCase().includes("unit"),
                                ) && "border-destructive",
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-xs w-24"
                              type="number"
                              step="0.01"
                              min="0"
                              value={String(
                                row.data.unitCost ||
                                  row.data["Unit Cost"] ||
                                  row.data.cost ||
                                  "",
                              )}
                              onChange={(e) =>
                                updateInventoryRowField(
                                  index,
                                  "unitCost",
                                  e.target.value,
                                )
                              }
                            />
                          </TableCell>
                        </>
                      )}
                      {type === "category" && (
                        <TableCell>
                          {String(
                            row.data.description || row.data.Description || "-",
                          )}
                        </TableCell>
                      )}
                      {type === "supplier" && (
                        <>
                          <TableCell>
                            {String(row.data.code || row.data.Code || "-")}
                          </TableCell>
                          <TableCell>
                            {String(
                              row.data.contactName ||
                                row.data["Contact Name"] ||
                                row.data.contact ||
                                "-",
                            )}
                          </TableCell>
                        </>
                      )}
                      {type === "staff" && (
                        <>
                          <TableCell>
                            <Combobox
                              options={jobRoleComboboxOptions}
                              value={String(row.data.role || row.data.Role || "")}
                              onValueChange={(value) =>
                                updateStaffRowField(index, "role", value)
                              }
                              placeholder="Select role..."
                              searchPlaceholder="Search roles..."
                              emptyText="No roles found."
                              className={cn(
                                "h-8 min-h-8 min-w-[160px] text-xs",
                                row.errors.some((e) => e.includes("role")) &&
                                  "border-destructive",
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-xs w-24"
                              type="number"
                              step="0.01"
                              value={String(
                                row.data.hourlyRate ||
                                  row.data["Hourly Rate"] ||
                                  "",
                              )}
                              onChange={(e) =>
                                updateStaffRowField(index, "hourlyRate", e.target.value)
                              }
                            />
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        {row.isValid ? (
                          <Badge variant="outline" className="text-emerald-600">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-destructive">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            {row.errors[0]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeRow(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {/* Step: Result */}
        {step === "result" && importResult && (
          <div className="py-8 text-center space-y-4">
            {importResult.success ? (
              <>
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Import Successful!</h3>
                  <p className="text-muted-foreground">
                    {importResult.created != null &&
                      `${importResult.created} item(s) imported.`}
                    {importResult.updated != null &&
                      `${importResult.updated} product(s) updated with option groups.`}
                    {importResult.created == null && importResult.updated == null && "Done."}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-8 w-8 text-destructive" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Import Failed</h3>
                  {importResult.errors?.map((error, i) => (
                    <p key={i} className="text-destructive text-sm">
                      {error}
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="flex-shrink-0 mt-4">
          {step === "upload" && (
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetDialog}>
                Start Over
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  isPending ||
                  validCount === 0 ||
                  ((type === "inventory" || type === "staff") &&
                    !selectedBranch)
                }
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>Import {validCount} Items</>
                )}
              </Button>
            </>
          )}
          {step === "result" && (
            <Button onClick={() => handleClose(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
