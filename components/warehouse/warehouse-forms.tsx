"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createWarehouse,
  createWarehouseItem,
  createWarehouseTransfer,
} from "@/lib/actions/warehouse";
import { Combobox } from "@/components/ui/combobox";
import { UNIT_TYPES, UNIT_LABELS } from "@/lib/constants/units";
import {
  INVENTORY_CATEGORIES,
  CATEGORY_LABELS,
} from "@/lib/constants/categories";

interface WarehouseData {
  id: string;
  name: string;
  code: string;
  organizationId: string;
}

interface WarehouseItem {
  id: string;
  warehouseId: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

// ─── Create Warehouse ────────────────────────────────────────────────

interface CreateWarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWarehouseDialog({
  open,
  onOpenChange,
}: CreateWarehouseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim() || !address.trim() || !city.trim()) {
      toast.error("Name, code, address, and city are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createWarehouse({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Warehouse created");
        setName("");
        setCode("");
        setAddress("");
        setCity("");
        setPhone("");
        setEmail("");
        onOpenChange(false);
      }
    } catch {
      toast.error("Failed to create warehouse");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Warehouse</DialogTitle>
          <DialogDescription>Add a new warehouse location</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Main Warehouse"
              />
            </div>
            <div className="grid gap-2">
              <Label>Code *</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="WH-001"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Address *</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Warehouse address"
            />
          </div>
          <div className="grid gap-2">
            <Label>City *</Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Warehouse Item ───────────────────────────────────────────

interface CreateWarehouseItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: WarehouseData[];
}

export function CreateWarehouseItemDialog({
  open,
  onOpenChange,
  warehouses,
}: CreateWarehouseItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("FOOD");
  const [unit, setUnit] = useState("KG");
  const [unitCost, setUnitCost] = useState(0);
  const [currentStock, setCurrentStock] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [reorderPoint, setReorderPoint] = useState(10);

  const handleSubmit = async () => {
    if (!warehouseId || !name.trim() || !sku.trim()) {
      toast.error("Warehouse, name, and SKU are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createWarehouseItem({
        warehouseId,
        name: name.trim(),
        sku: sku.trim(),
        category: category as any,
        unit: unit as any,
        unitCost,
        currentStock,
        minStock,
        reorderPoint,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Item added to warehouse");
        setName("");
        setSku("");
        setUnitCost(0);
        setCurrentStock(0);
        onOpenChange(false);
      }
    } catch {
      toast.error("Failed to create item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Warehouse Item</DialogTitle>
          <DialogDescription>
            Add inventory item to a warehouse
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Warehouse *</Label>
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Item name"
              />
            </div>
            <div className="grid gap-2">
              <Label>SKU *</Label>
              <Input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="WH-ITEM-001"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map((unitType) => (
                    <SelectItem key={unitType} value={unitType}>
                      {UNIT_LABELS[unitType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Unit Cost</Label>
              <Input
                type="number"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Current Stock</Label>
              <Input
                type="number"
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Min Stock</Label>
              <Input
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Reorder Point</Label>
              <Input
                type="number"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Transfer ─────────────────────────────────────────────────

interface CreateTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: WarehouseData[];
  items: WarehouseItem[];
  branches: Branch[];
}

export function CreateTransferDialog({
  open,
  onOpenChange,
  warehouses,
  items,
  branches,
}: CreateTransferDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouseItemId, setWarehouseItemId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState("");

  const filteredItems = items.filter(
    (i) => !warehouseId || i.warehouseId === warehouseId,
  );
  const selectedItem = filteredItems.find((i) => i.id === warehouseItemId);
  const qtyExceedsStock =
    selectedItem != null &&
    quantity > 0 &&
    quantity > selectedItem.currentStock;

  const handleSubmit = async () => {
    if (!warehouseId || !warehouseItemId || !toBranchId || quantity <= 0) {
      toast.error("All fields are required and quantity must be > 0");
      return;
    }
    if (selectedItem && quantity > selectedItem.currentStock) {
      toast.error(
        `Quantity exceeds available stock for ${selectedItem.name} (max ${selectedItem.currentStock} ${selectedItem.unit})`,
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createWarehouseTransfer({
        warehouseId,
        warehouseItemId,
        toBranchId,
        quantity,
        notes: notes.trim() || undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Transfer request created");
        setWarehouseId("");
        setWarehouseItemId("");
        setToBranchId("");
        setQuantity(0);
        setNotes("");
        onOpenChange(false);
      }
    } catch {
      toast.error("Failed to create transfer");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Transfer</DialogTitle>
          <DialogDescription>
            Transfer stock from warehouse to branch
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>From Warehouse *</Label>
            <Select
              value={warehouseId}
              onValueChange={(v) => {
                setWarehouseId(v);
                setWarehouseItemId("");
              }}
            >
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
          </div>
          <div className="grid gap-2">
            <Label>Item *</Label>
            <Combobox
              options={filteredItems.map((i) => ({
                value: i.id,
                label: i.name,
                description: `${i.sku} — ${i.currentStock} ${i.unit} available`,
              }))}
              value={warehouseItemId}
              onValueChange={setWarehouseItemId}
              placeholder="Select item"
              searchPlaceholder="Search items..."
              emptyText="No items found"
              disabled={!warehouseId}
            />
          </div>
          <div className="grid gap-2">
            <Label>To Branch *</Label>
            <Combobox
              options={branches.map((b) => ({
                value: b.id,
                label: b.name,
                description: b.code,
              }))}
              value={toBranchId}
              onValueChange={setToBranchId}
              placeholder="Select branch"
              searchPlaceholder="Search branches..."
              emptyText="No branches found"
            />
          </div>
          <div className="grid gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Label>Quantity *</Label>
              {selectedItem && (
                <span className="text-xs text-muted-foreground">
                  Unit:{" "}
                  <span className="font-medium text-foreground">
                    {selectedItem.unit}
                  </span>
                  {" · "}
                  Max: {selectedItem.currentStock} {selectedItem.unit}
                </span>
              )}
            </div>
            <Input
              type="number"
              min={0}
              max={selectedItem ? selectedItem.currentStock : undefined}
              step="any"
              value={quantity || ""}
              onChange={(e) => setQuantity(Number(e.target.value))}
              onBlur={() => {
                if (!selectedItem || !quantity) return;
                if (quantity > selectedItem.currentStock) {
                  setQuantity(selectedItem.currentStock);
                }
              }}
              className={qtyExceedsStock ? "border-destructive" : undefined}
              aria-invalid={qtyExceedsStock}
            />
            {qtyExceedsStock && selectedItem && (
              <p className="text-xs text-destructive">
                Cannot transfer more than {selectedItem.currentStock}{" "}
                {selectedItem.unit} on hand.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Transfer notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || qtyExceedsStock}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk transfer to branch (one createWarehouseTransfer per line) ──

interface BulkTransferLine {
  key: string;
  warehouseItemId: string;
  quantity: number;
}

function newLine(): BulkTransferLine {
  return {
    key:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now() + Math.random()),
    warehouseItemId: "",
    quantity: 0,
  };
}

interface BulkTransferToBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: WarehouseData[];
  items: WarehouseItem[];
  branches: Branch[];
}

export function BulkTransferToBranchDialog({
  open,
  onOpenChange,
  warehouses,
  items,
  branches,
}: BulkTransferToBranchDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<BulkTransferLine[]>([newLine()]);

  const filteredItems = useMemo(
    () => items.filter((i) => !warehouseId || i.warehouseId === warehouseId),
    [items, warehouseId],
  );

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const hasInvalidQuantities = useMemo(
    () =>
      lines.some((l) => {
        if (!l.warehouseItemId || l.quantity <= 0) return false;
        const item = itemById.get(l.warehouseItemId);
        return item != null && l.quantity > item.currentStock;
      }),
    [lines, itemById],
  );

  const reset = () => {
    setWarehouseId("");
    setToBranchId("");
    setNotes("");
    setLines([newLine()]);
  };

  const addLine = () => setLines((prev) => [newLine(), ...prev]);

  const removeLine = (key: string) => {
    setLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((l) => l.key !== key),
    );
  };

  const updateLine = (
    key: string,
    patch: Partial<Pick<BulkTransferLine, "warehouseItemId" | "quantity">>,
  ) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  };

  const handleSubmit = async () => {
    if (!warehouseId || !toBranchId) {
      toast.error("Select warehouse and destination branch");
      return;
    }

    const filled = lines.filter((l) => l.warehouseItemId && l.quantity > 0);
    if (filled.length === 0) {
      toast.error("Add at least one item with quantity greater than 0");
      return;
    }

    const itemIds = filled.map((l) => l.warehouseItemId);
    if (new Set(itemIds).size !== itemIds.length) {
      toast.error("Each item can only appear once in the list");
      return;
    }

    for (const line of filled) {
      const item = itemById.get(line.warehouseItemId);
      if (!item || item.warehouseId !== warehouseId) {
        toast.error("Invalid item selection");
        return;
      }
      if (line.quantity > item.currentStock) {
        toast.error(
          `Insufficient stock for ${item.name} (max ${item.currentStock} ${item.unit})`,
        );
        return;
      }
    }

    const notesVal = notes.trim() || undefined;
    setIsSubmitting(true);
    let ok = 0;
    let fail = 0;
    let lastError: string | undefined;
    try {
      for (const line of filled) {
        const result = await createWarehouseTransfer({
          warehouseId,
          warehouseItemId: line.warehouseItemId,
          toBranchId,
          quantity: line.quantity,
          notes: notesVal,
        });
        if (result.error) {
          fail += 1;
          lastError = result.error;
        } else {
          ok += 1;
        }
      }

      if (ok > 0 && fail === 0) {
        toast.success(`Created ${ok} transfer request${ok === 1 ? "" : "s"}`);
        reset();
        onOpenChange(false);
      } else if (ok > 0 && fail > 0) {
        toast.warning(
          `Created ${ok} transfer(s); ${fail} failed${lastError ? `: ${lastError}` : ""}`,
        );
        reset();
        onOpenChange(false);
      } else {
        toast.error(lastError || "Failed to create transfers");
      }
    } catch {
      toast.error("Failed to create transfers");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      {/* gap-0 + overflow-hidden: override base Dialog grid so header/footer stay fixed and items list scrolls */}
      <DialogContent className="max-w-2xl max-h-[min(90vh,880px)] !flex !flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="shrink-0 space-y-1.5 px-6 pt-6 pr-14 mb-2">
          <DialogHeader className="text-left">
            <DialogTitle>Bulk transfer to branch</DialogTitle>
            <DialogDescription className="text-blue-700">
              Choose one warehouse and branch, then add multiple items with
              quantities. Each line creates a separate transfer request (same as
              single transfer).
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 pb-2">
          <div className="grid shrink-0 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>From warehouse *</Label>
              <Select
                value={warehouseId}
                onValueChange={(v) => {
                  setWarehouseId(v);
                  setLines([newLine()]);
                }}
              >
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
            </div>
            <div className="grid gap-2">
              <Label>To branch *</Label>
              <Combobox
                options={branches.map((b) => ({
                  value: b.id,
                  label: b.name,
                  description: b.code,
                }))}
                value={toBranchId}
                onValueChange={setToBranchId}
                placeholder="Select branch"
                searchPlaceholder="Search branches..."
                emptyText="No branches found"
              />
            </div>
          </div>

          <div className="grid shrink-0 gap-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Applied to each transfer in this batch"
              className="resize-none"
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <Label>Items *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
                disabled={!warehouseId}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add item
              </Button>
            </div>
            <div
              className="min-h-0 max-h-[min(50vh,420px)] flex-1 overflow-y-auto overscroll-contain rounded-lg border border-border bg-muted/20 p-3 [scrollbar-gutter:stable]"
              role="list"
              aria-label="Transfer line items"
            >
              <div className="space-y-3">
                {lines.map((line) => {
                  const selected = line.warehouseItemId
                    ? itemById.get(line.warehouseItemId)
                    : undefined;
                  const overStock =
                    selected != null &&
                    line.quantity > 0 &&
                    line.quantity > selected.currentStock;
                  return (
                    <div key={line.key} className="space-y-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1 grid gap-2">
                          <Label className="text-xs text-muted-foreground sm:sr-only">
                            Item
                          </Label>
                          <Combobox
                            options={filteredItems.map((i) => ({
                              value: i.id,
                              label: i.name,
                              description: `${i.sku} — ${i.currentStock} ${i.unit} available`,
                            }))}
                            value={line.warehouseItemId}
                            onValueChange={(v) =>
                              updateLine(line.key, { warehouseItemId: v })
                            }
                            placeholder="Select item"
                            searchPlaceholder="Search items..."
                            emptyText="No items"
                            disabled={!warehouseId}
                          />
                        </div>
                        <div className="grid w-full gap-1 sm:w-36">
                          <Label className="text-xs text-muted-foreground sm:sr-only">
                            Qty {selected ? `(${selected.unit})` : ""}
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={selected ? selected.currentStock : undefined}
                            step="any"
                            value={line.quantity || ""}
                            onChange={(e) =>
                              updateLine(line.key, {
                                quantity: Number(e.target.value),
                              })
                            }
                            onBlur={() => {
                              if (!selected || !line.quantity) return;
                              if (line.quantity > selected.currentStock) {
                                updateLine(line.key, {
                                  quantity: selected.currentStock,
                                });
                              }
                            }}
                            placeholder="0"
                            className={
                              overStock ? "border-destructive" : undefined
                            }
                            aria-invalid={overStock}
                            aria-label={
                              selected
                                ? `Quantity in ${selected.unit}`
                                : "Quantity"
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => removeLine(line.key)}
                          disabled={lines.length <= 1}
                          aria-label="Remove line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {overStock && selected && (
                        <p className="text-xs text-destructive">
                          Cannot transfer more than {selected.currentStock}{" "}
                          {selected.unit} on hand.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t bg-background px-6 py-4 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !warehouseId ||
              !toBranchId ||
              hasInvalidQuantities
            }
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create transfers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
