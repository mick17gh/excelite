"use client";

import { useState, useRef, useTransition } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  bulkCreateInventoryItems,
  parseMenuCSV,
  parseInventoryCSV,
  getMenuCSVTemplate,
  getInventoryCSVTemplate,
  type BulkMenuItemInput,
  type BulkInventoryItemInput,
} from "@/lib/actions/bulk";

type ImportType = "menu" | "inventory";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ImportType;
  branches?: Array<{ id: string; name: string }>;
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
    const template = type === "menu" ? getMenuCSVTemplate() : getInventoryCSVTemplate();
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${type}-import-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (content: string): Record<string, string>[] => {
    const lines = content.trim().split("\n");
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

  const validateRow = (row: Record<string, string>, index: number): ParsedRow => {
    const errors: string[] = [];

    if (type === "menu") {
      if (!row.name && !row.Name) errors.push("Name is required");
      const price = parseFloat(row.price || row.Price || "0");
      if (isNaN(price) || price <= 0) errors.push("Valid price is required");
      if (!row.category && !row.Category) errors.push("Category is required");
    } else {
      if (!row.name && !row.Name) errors.push("Name is required");
      const unitCost = parseFloat(row.unitCost || row["Unit Cost"] || row.cost || "0");
      if (isNaN(unitCost) || unitCost < 0) errors.push("Valid unit cost is required");
      if (!row.unit && !row.Unit) errors.push("Unit is required");
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

      const validated = rows.map((row, index) => validateRow(row, index));
      setParsedData(validated);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const removeRow = (index: number) => {
    setParsedData((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    const validRows = parsedData.filter((r) => r.isValid);

    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    if (type === "inventory" && !selectedBranch) {
      toast.error("Please select a branch");
      return;
    }

    startTransition(async () => {
      try {
        let result;

        if (type === "menu") {
          const items = parseMenuCSV(validRows.map((r) => r.data as Record<string, string>));
          result = await bulkCreateMenuItems(items);
        } else {
          const items = parseInventoryCSV(
            validRows.map((r) => r.data as Record<string, string>),
            selectedBranch
          );
          result = await bulkCreateInventoryItems(items);
        }

        if (result.success) {
          setImportResult({ success: true, created: result.created });
          setStep("result");
          onSuccess?.();
        } else {
          setImportResult({ success: false, errors: [result.error || "Import failed"] });
          setStep("result");
        }
      } catch (error) {
        console.error("Import error:", error);
        setImportResult({ success: false, errors: ["An unexpected error occurred"] });
        setStep("result");
      }
    });
  };

  const validCount = parsedData.filter((r) => r.isValid).length;
  const invalidCount = parsedData.filter((r) => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Import {type === "menu" ? "Menu Items" : "Inventory Items"}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import {type === "menu" ? "menu items" : "inventory items"}
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
                {type === "menu" ? (
                  <>Required columns: <code>name</code>, <code>category</code>, <code>price</code>. Optional: <code>sku</code>, <code>cost</code>, <code>description</code>, <code>isActive</code></>
                ) : (
                  <>Required columns: <code>name</code>, <code>unit</code>, <code>unitCost</code>. Optional: <code>sku</code>, <code>category</code>, <code>currentStock</code>, <code>minStock</code>, <code>maxStock</code>, <code>reorderPoint</code></>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div className="flex-1 flex flex-col min-h-0 py-4">
            <div className="flex items-center justify-between mb-4">
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
              {type === "inventory" && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Branch:</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    {type === "menu" ? (
                      <>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead>Unit</TableHead>
                        <TableHead>Unit Cost</TableHead>
                      </>
                    )}
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row, index) => (
                    <TableRow key={index} className={!row.isValid ? "bg-destructive/5" : ""}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {String(row.data.name || row.data.Name || "-")}
                      </TableCell>
                      {type === "menu" ? (
                        <>
                          <TableCell>{String(row.data.category || row.data.Category || "-")}</TableCell>
                          <TableCell>{String(row.data.price || row.data.Price || "-")}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{String(row.data.unit || row.data.Unit || "-")}</TableCell>
                          <TableCell>{String(row.data.unitCost || row.data["Unit Cost"] || row.data.cost || "-")}</TableCell>
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
                    {importResult.created} items have been imported
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
                    <p key={i} className="text-destructive text-sm">{error}</p>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
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
                disabled={isPending || validCount === 0 || (type === "inventory" && !selectedBranch)}
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
            <Button onClick={() => handleClose(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
