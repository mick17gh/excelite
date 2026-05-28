"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { bulkCreateWarehouseItems } from "@/lib/actions/warehouse";
import {
  parseWarehouseCSV,
  getWarehouseCSVTemplate,
  type BulkWarehouseItemInput,
} from "@/lib/utils/bulk-import";
import { UNIT_TYPES, UNIT_LABELS } from "@/lib/constants/units";

interface WarehouseImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; code: string }>;
  defaultWarehouseId?: string;
}

interface ParsedRow extends BulkWarehouseItemInput {
  _valid: boolean;
  _errors: string[];
  _index: number;
}

const VALID_STAGES = ["RAW", "PROCESSED", "BRANCH_READY"] as const;

export function WarehouseImportDialog({
  open,
  onOpenChange,
  warehouses,
  categories,
  defaultWarehouseId,
}: WarehouseImportDialogProps) {
  const router = useRouter();
  const categoryLookup = new Set(
    categories.flatMap((c) => [c.id, c.code.toLowerCase(), c.name.toLowerCase()]),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState<string>("");

  const warehouseName =
    warehouses.find((w) => w.id === warehouseId)?.name || undefined;

  // Default selection when opening the dialog.
  // Prefer the passed default, otherwise first warehouse.
  // Reset selection if the current one is no longer available.
  useEffect(() => {
    if (!open) return;
    const exists = warehouseId && warehouses.some((w) => w.id === warehouseId);
    if (exists) return;
    if (defaultWarehouseId && warehouses.some((w) => w.id === defaultWarehouseId)) {
      setWarehouseId(defaultWarehouseId);
      return;
    }
    setWarehouseId(warehouses[0]?.id ?? "");
  }, [open, warehouseId, warehouses, defaultWarehouseId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      setParseError("Please select a CSV file");
      return;
    }

    setFile(selectedFile);
    setParseError(null);

    try {
      const text = await selectedFile.text();
      const rows = parseCSVText(text);
      
      if (rows.length === 0) {
        setParseError("No data found in CSV file");
        return;
      }

      const parsed = parseWarehouseCSV(rows);
      
      // Validate each row
      const validatedData: ParsedRow[] = parsed.map((item, index) => {
        const errors: string[] = [];
        
        if (!item.name || item.name.trim() === "") {
          errors.push("Name is required");
        }
        if (!item.sku || item.sku.trim() === "") {
          errors.push("SKU is required");
        }
        if (!item.categoryId || item.categoryId.trim() === "") {
          errors.push("Category is required");
        } else if (!categoryLookup.has(item.categoryId.toLowerCase())) {
          errors.push(`Invalid category (${item.categoryId}). Choose a known category`);
        }
        if (!item.unit || item.unit.trim() === "") {
          errors.push("Unit is required");
        } else if (!UNIT_TYPES.includes(item.unit as any)) {
          errors.push(`Invalid unit. Must be one of: ${UNIT_TYPES.join(", ")}`);
        }
        if (isNaN(item.unitCost) || item.unitCost <= 0) {
          errors.push("Unit cost must be a positive number");
        }
        if (item.currentStock !== undefined && (isNaN(item.currentStock) || item.currentStock < 0)) {
          errors.push("Current stock must be non-negative");
        }
        if (item.minStock !== undefined && (isNaN(item.minStock) || item.minStock < 0)) {
          errors.push("Min stock must be non-negative");
        }
        if (item.reorderPoint !== undefined && (isNaN(item.reorderPoint) || item.reorderPoint < 0)) {
          errors.push("Reorder point must be non-negative");
        }
        if (
          item.maxStock != null &&
          item.maxStock !== undefined &&
          (isNaN(item.maxStock) || item.maxStock < 0)
        ) {
          errors.push("Max stock must be non-negative");
        }

        if (item.itemStage != null) {
          if (!VALID_STAGES.includes(item.itemStage as any)) {
            errors.push(`Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}`);
          }
        }

        return {
          ...item,
          _valid: errors.length === 0,
          _errors: errors,
          _index: index,
        };
      });

      // Check for duplicate SKUs within the import
      const skuCounts = new Map<string, number>();
      validatedData.forEach((item) => {
        if (item.sku) {
          skuCounts.set(item.sku, (skuCounts.get(item.sku) || 0) + 1);
        }
      });

      // Mark duplicates
      const finalData = validatedData.map((item) => {
        if (item.sku && skuCounts.get(item.sku)! > 1) {
          return {
            ...item,
            _valid: false,
            _errors: [...item._errors, `Duplicate SKU in import: ${item.sku}`],
          };
        }
        return item;
      });

      setParsedData(finalData);
    } catch (error) {
      console.error("Parse error:", error);
      setParseError("Failed to parse CSV file. Please check the format.");
    }
  };

  const parseCSVText = (text: string): Record<string, string>[] => {
    const lines = text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue;

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rows.push(row);
    }

    return rows;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleDownloadTemplate = () => {
    const template = getWarehouseCSVTemplate();
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (warehouseName || "warehouse").replace(/[^a-z0-9-_]+/gi, "_");
    a.download = `${safeName}_items_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const removeRow = (index: number) => {
    setParsedData((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRowField = (index: number, field: keyof BulkWarehouseItemInput, value: any) => {
    setParsedData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Re-validate the row
      const errors: string[] = [];
      const item = updated[index];
      
      if (!item.name || item.name.trim() === "") errors.push("Name is required");
      if (!item.sku || item.sku.trim() === "") errors.push("SKU is required");
      if (!item.categoryId || !categoryLookup.has(item.categoryId.toLowerCase())) {
        errors.push("Valid category is required");
      }
      if (!item.unit || !UNIT_TYPES.includes(item.unit as any)) {
        errors.push("Valid unit is required");
      }
      if (isNaN(item.unitCost) || item.unitCost <= 0) errors.push("Valid unit cost required");
      if (item.itemStage != null) {
        if (!VALID_STAGES.includes(item.itemStage as any)) {
          errors.push(`Valid stage is required (${VALID_STAGES.join(", ")})`);
        }
      }
      
      updated[index]._valid = errors.length === 0;
      updated[index]._errors = errors;
      
      return updated;
    });
  };

  const handleImport = () => {
    if (!warehouseId) {
      toast.error("Select a warehouse to import into");
      return;
    }
    const validItems = parsedData.filter((item) => item._valid);
    
    if (validItems.length === 0) {
      toast.error("No valid items to import");
      return;
    }

    startTransition(async () => {
      const itemsToImport: BulkWarehouseItemInput[] = validItems.map(({ _valid, _errors, ...item }) => item);
      const result = await bulkCreateWarehouseItems(warehouseId, itemsToImport);

      if (result.data) {
        toast.success(`Successfully imported ${result.data.created} warehouse items`);
        onOpenChange(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to import warehouse items");
      }
    });
  };

  const resetForm = () => {
    setFile(null);
    setParsedData([]);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validCount = parsedData.filter((r) => r._valid).length;
  const invalidCount = parsedData.filter((r) => !r._valid).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Warehouse Items from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV for {warehouseName || "the selected warehouse"}. The template
            includes stock limits, branch par (maxStock), item stage, and commissary
            flags — same fields as Add Warehouse Item.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4">
          {/* Warehouse picker */}
          <div className="grid gap-2">
            <span className="text-sm font-medium">Warehouse</span>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Imported items will be created in the selected warehouse.
            </p>
          </div>

          {/* Upload Section */}
          {!file && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground mt-1">CSV files only</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                className="w-full"
                disabled={!warehouseId}
              >
                <Download className="mr-2 h-4 w-4" />
                Download CSV Template
              </Button>
              <p className="text-xs text-muted-foreground">
                Columns: name, sku, category, unit, unitCost, currentStock, minStock,
                reorderPoint, maxStock, itemStage, requiresCommissaryProcessing,
                allowDirectToBranch, isActive
              </p>
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Preview Section */}
          {file && parsedData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {validCount} valid
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {invalidCount} errors
                    </Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="w-[180px]">Category</TableHead>
                      <TableHead className="w-[150px]">Unit</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>Errors</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((row, index) => (
                      <TableRow key={index} className={!row._valid ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
                        <TableCell>
                          {row._valid ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{row.name || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{row.sku || "-"}</TableCell>
                        <TableCell>
                          <Select
                            value={row.categoryId || ""}
                            onValueChange={(value) => updateRowField(index, "categoryId", value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id} className="text-xs">
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.unit || ""}
                            onValueChange={(value) => updateRowField(index, "unit", value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {UNIT_TYPES.map((unit) => (
                                <SelectItem key={unit} value={unit} className="text-xs">
                                  {UNIT_LABELS[unit]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          {isNaN(row.unitCost) ? "-" : `GH₵ ${row.unitCost.toFixed(2)}`}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.currentStock === undefined || isNaN(row.currentStock) ? "-" : row.currentStock}
                        </TableCell>
                        <TableCell>
                          {row._errors.length > 0 && (
                            <span className="text-xs text-red-600">{row._errors[0]}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removeRow(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isPending || validCount === 0}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import {validCount} Items
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
