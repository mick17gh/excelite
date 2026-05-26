"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createWarehouse,
  createWarehouseItem,
  createWarehouseTransfer,
  updateWarehouse,
  updateWarehouseItem,
} from "@/lib/actions/warehouse";
import { createWarehouseToWarehouseTransfer } from "@/lib/actions/stock-transfers";
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
  warehouseType?: string;
}

export interface WarehouseFormData {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  warehouseType: "RAW" | "COMMISSARY";
  isActive: boolean;
}

export function warehouseTypeLabel(type?: string): string {
  if (type === "COMMISSARY") return "Commissary";
  return "Raw materials";
}

export function itemStageLabel(stage?: string): string {
  switch (stage) {
    case "PROCESSED":
      return "Processed";
    case "BRANCH_READY":
      return "Branch-ready";
    case "RAW":
    default:
      return "Raw";
  }
}

export interface WarehouseItemFormData {
  id: string;
  warehouseId: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  unitCost: number;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  maxStock?: number | null;
  itemStage?: "RAW" | "PROCESSED" | "BRANCH_READY";
  requiresCommissaryProcessing?: boolean;
  allowDirectToBranch?: boolean;
  isActive?: boolean;
}

interface WarehouseItem {
  id: string;
  warehouseId: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  itemStage?: "RAW" | "PROCESSED" | "BRANCH_READY";
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
  const [warehouseType, setWarehouseType] = useState<"RAW" | "COMMISSARY">("RAW");

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
        warehouseType,
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
          <div className="grid gap-2">
            <Label>Type *</Label>
            <Select
              value={warehouseType}
              onValueChange={(v) => setWarehouseType(v as "RAW" | "COMMISSARY")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RAW">Raw materials warehouse</SelectItem>
                <SelectItem value="COMMISSARY">Commissary / back kitchen</SelectItem>
              </SelectContent>
            </Select>
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

// ─── Edit Warehouse ──────────────────────────────────────────────────

interface EditWarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: WarehouseFormData | null;
}

export function EditWarehouseDialog({
  open,
  onOpenChange,
  warehouse,
}: EditWarehouseDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [warehouseType, setWarehouseType] = useState<"RAW" | "COMMISSARY">("RAW");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!warehouse || !open) return;
    setName(warehouse.name);
    setAddress(warehouse.address);
    setCity(warehouse.city);
    setPhone(warehouse.phone || "");
    setEmail(warehouse.email || "");
    setWarehouseType(warehouse.warehouseType);
    setIsActive(warehouse.isActive);
  }, [warehouse, open]);

  const handleSubmit = async () => {
    if (!warehouse) return;
    if (!name.trim() || !address.trim() || !city.trim()) {
      toast.error("Name, address, and city are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await updateWarehouse({
        id: warehouse.id,
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        warehouseType,
        isActive,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Warehouse updated");
        onOpenChange(false);
        router.refresh();
      }
    } catch {
      toast.error("Failed to update warehouse");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit warehouse</DialogTitle>
          <DialogDescription>
            Code <span className="font-mono">{warehouse?.code}</span> cannot be changed.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Address *</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>City *</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Type *</Label>
            <Select
              value={warehouseType}
              onValueChange={(v) => setWarehouseType(v as "RAW" | "COMMISSARY")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RAW">Raw materials warehouse</SelectItem>
                <SelectItem value="COMMISSARY">Commissary / back kitchen</SelectItem>
              </SelectContent>
            </Select>
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
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive warehouses are hidden from most transfer flows.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !warehouse}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
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
  const [maxStock, setMaxStock] = useState<string>("");
  const [itemStage, setItemStage] = useState<"RAW" | "PROCESSED" | "BRANCH_READY">("RAW");
  const [requiresCommissaryProcessing, setRequiresCommissaryProcessing] = useState(false);
  const [allowDirectToBranch, setAllowDirectToBranch] = useState(true);

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
        maxStock: maxStock.trim() ? Number(maxStock) : null,
        itemStage,
        requiresCommissaryProcessing,
        allowDirectToBranch,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Item added to warehouse");
        setName("");
        setSku("");
        setUnitCost(0);
        setCurrentStock(0);
        setMaxStock("");
        setItemStage("RAW");
        setRequiresCommissaryProcessing(false);
        setAllowDirectToBranch(true);
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
          <div className="grid gap-2">
            <Label>Branch par level (max stock)</Label>
            <Input
              type="number"
              min={0}
              value={maxStock}
              onChange={(e) => setMaxStock(e.target.value)}
              placeholder="Optional"
            />
            <p className="text-xs text-muted-foreground">
              Used when sending stock to branches. Leave empty to use 5× reorder point.
            </p>
          </div>
          <div className="grid gap-2">
            <Label>Item stage</Label>
            <Select
              value={itemStage}
              onValueChange={(v) => setItemStage(v as "RAW" | "PROCESSED" | "BRANCH_READY")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RAW">Raw</SelectItem>
                <SelectItem value="PROCESSED">Processed</SelectItem>
                <SelectItem value="BRANCH_READY">Branch-ready</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Requires commissary processing</Label>
            <Switch
              checked={requiresCommissaryProcessing}
              onCheckedChange={setRequiresCommissaryProcessing}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Allow direct to branch</Label>
            <Switch checked={allowDirectToBranch} onCheckedChange={setAllowDirectToBranch} />
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

// ─── Edit Warehouse Item ─────────────────────────────────────────────

interface EditWarehouseItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: WarehouseItemFormData | null;
  warehouseName?: string;
}

export function EditWarehouseItemDialog({
  open,
  onOpenChange,
  item,
  warehouseName,
}: EditWarehouseItemDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("FOOD");
  const [unit, setUnit] = useState("KG");
  const [unitCost, setUnitCost] = useState(0);
  const [currentStock, setCurrentStock] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [reorderPoint, setReorderPoint] = useState(10);
  const [maxStock, setMaxStock] = useState<string>("");
  const [itemStage, setItemStage] = useState<"RAW" | "PROCESSED" | "BRANCH_READY">("RAW");
  const [requiresCommissaryProcessing, setRequiresCommissaryProcessing] = useState(false);
  const [allowDirectToBranch, setAllowDirectToBranch] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!item || !open) return;
    setName(item.name);
    setCategory(item.category);
    setUnit(item.unit);
    setUnitCost(item.unitCost);
    setCurrentStock(item.currentStock);
    setMinStock(item.minStock);
    setReorderPoint(item.reorderPoint);
    setMaxStock(
      item.maxStock != null && item.maxStock > 0 ? String(item.maxStock) : "",
    );
    setItemStage(item.itemStage || "RAW");
    setRequiresCommissaryProcessing(item.requiresCommissaryProcessing ?? false);
    setAllowDirectToBranch(item.allowDirectToBranch ?? true);
    setIsActive(item.isActive ?? true);
  }, [item, open]);

  const handleSubmit = async () => {
    if (!item) return;
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await updateWarehouseItem({
        id: item.id,
        name: name.trim(),
        category: category as any,
        unit: unit as any,
        unitCost,
        currentStock,
        minStock,
        reorderPoint,
        maxStock: maxStock.trim() ? Number(maxStock) : null,
        itemStage,
        requiresCommissaryProcessing,
        allowDirectToBranch,
        isActive,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Item updated");
        onOpenChange(false);
        router.refresh();
      }
    } catch {
      toast.error("Failed to update item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit warehouse item</DialogTitle>
          <DialogDescription>
            {warehouseName ? `${warehouseName} · ` : ""}
            SKU <span className="font-mono">{item?.sku}</span> cannot be changed.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
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
              <Label>Unit cost</Label>
              <Input
                type="number"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Current stock</Label>
              <Input
                type="number"
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Min stock</Label>
              <Input
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Reorder point</Label>
              <Input
                type="number"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Branch par level (max stock)</Label>
            <Input
              type="number"
              min={0}
              value={maxStock}
              onChange={(e) => setMaxStock(e.target.value)}
              placeholder="Optional"
            />
            <p className="text-xs text-muted-foreground">
              Used when sending stock to branches. Leave empty to use 5× reorder point.
            </p>
          </div>
          <div className="grid gap-2">
            <Label>Item stage</Label>
            <Select
              value={itemStage}
              onValueChange={(v) => setItemStage(v as "RAW" | "PROCESSED" | "BRANCH_READY")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RAW">Raw</SelectItem>
                <SelectItem value="PROCESSED">Processed</SelectItem>
                <SelectItem value="BRANCH_READY">Branch-ready</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Branch-ready = production output / dispatch. Processed or raw = ingredients.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Requires commissary processing</Label>
            <Switch
              checked={requiresCommissaryProcessing}
              onCheckedChange={setRequiresCommissaryProcessing}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Allow direct to branch</Label>
            <Switch checked={allowDirectToBranch} onCheckedChange={setAllowDirectToBranch} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !item}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
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
  title?: string;
  description?: string;
  branchReadyItemsOnly?: boolean;
}

export function BulkTransferToBranchDialog({
  open,
  onOpenChange,
  warehouses,
  items,
  branches,
  title = "Bulk transfer to branch",
  description = "Choose one warehouse and branch, then add multiple items with quantities. Each line creates a separate transfer request (same as single transfer).",
  branchReadyItemsOnly = false,
}: BulkTransferToBranchDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<BulkTransferLine[]>([newLine()]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (branchReadyItemsOnly && i.itemStage !== "BRANCH_READY") return false;
      if (!warehouseId || i.warehouseId === warehouseId) return true;
      return false;
    });
  }, [items, warehouseId, branchReadyItemsOnly]);

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
        router.refresh();
      } else if (ok > 0 && fail > 0) {
        toast.warning(
          `Created ${ok} transfer(s); ${fail} failed${lastError ? `: ${lastError}` : ""}`,
        );
        reset();
        onOpenChange(false);
        router.refresh();
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
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-blue-700">{description}</DialogDescription>
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

// ─── Bulk transfer warehouse to warehouse (RAW → COMMISSARY) ──

export function BulkTransferToWarehouseDialog({
  open,
  onOpenChange,
  warehouses,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: WarehouseData[];
  items: WarehouseItem[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<BulkTransferLine[]>([newLine()]);

  const rawWarehouses = warehouses.filter((w) => w.warehouseType !== "COMMISSARY");
  const commissaryWarehouses = warehouses.filter((w) => w.warehouseType === "COMMISSARY");

  const filteredItems = useMemo(
    () => items.filter((i) => !fromWarehouseId || i.warehouseId === fromWarehouseId),
    [items, fromWarehouseId],
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
    setFromWarehouseId("");
    setToWarehouseId("");
    setNotes("");
    setLines([newLine()]);
  };

  const addLine = () => setLines((prev) => [newLine(), ...prev]);
  const removeLine = (key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  };
  const updateLine = (
    key: string,
    patch: Partial<Pick<BulkTransferLine, "warehouseItemId" | "quantity">>,
  ) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const handleSubmit = async () => {
    if (!fromWarehouseId || !toWarehouseId) {
      toast.error("Select source and destination warehouses");
      return;
    }
    const filled = lines.filter((l) => l.warehouseItemId && l.quantity > 0);
    if (filled.length === 0) {
      toast.error("Add at least one item with quantity greater than 0");
      return;
    }
    for (const line of filled) {
      const item = itemById.get(line.warehouseItemId);
      if (!item || item.warehouseId !== fromWarehouseId) {
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
        const res = await createWarehouseToWarehouseTransfer({
          fromWarehouseId,
          toWarehouseId,
          warehouseItemId: line.warehouseItemId,
          quantity: line.quantity,
          notes: notesVal,
          transferKind: "MATERIAL_ISSUE",
        });
        if (res.error) {
          fail += 1;
          lastError = res.error;
        } else ok += 1;
      }
      if (ok > 0 && fail === 0) {
        toast.success(`Created ${ok} material issue(s) — complete them on Material issues tab`);
        reset();
        onOpenChange(false);
        router.refresh();
      } else if (ok > 0 && fail > 0) {
        toast.warning(
          `Created ${ok}; ${fail} failed${lastError ? `: ${lastError}` : ""}`,
        );
        reset();
        onOpenChange(false);
        router.refresh();
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
      <DialogContent className="max-w-2xl max-h-[min(90vh,880px)] !flex !flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="shrink-0 space-y-1.5 px-6 pt-6 pr-14 mb-2">
          <DialogHeader className="text-left">
            <DialogTitle>Bulk material issue (RAW → commissary)</DialogTitle>
            <DialogDescription className="text-blue-700">
              Issue bulk ingredients from a RAW warehouse to commissary. Complete each line on
              the Material issues tab to update stock.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 pb-2">
          <div className="grid shrink-0 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>From (RAW) *</Label>
              <Select
                value={fromWarehouseId}
                onValueChange={(v) => {
                  setFromWarehouseId(v);
                  setLines([newLine()]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {rawWarehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>To (Commissary) *</Label>
              <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  {commissaryWarehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid shrink-0 gap-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
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
                disabled={!fromWarehouseId}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add item
              </Button>
            </div>
            <div className="min-h-0 max-h-[min(50vh,420px)] flex-1 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
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
                        <div className="min-w-0 flex-1">
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
                            disabled={!fromWarehouseId}
                          />
                        </div>
                        <div className="grid w-full gap-1 sm:w-36">
                          <Input
                            type="number"
                            min={0}
                            max={selected ? selected.currentStock : undefined}
                            step="any"
                            value={line.quantity || ""}
                            onChange={(e) =>
                              updateLine(line.key, { quantity: Number(e.target.value) })
                            }
                            placeholder="Qty"
                            className={overStock ? "border-destructive" : undefined}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => removeLine(line.key)}
                          disabled={lines.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {overStock && selected && (
                        <p className="text-xs text-destructive">
                          Max {selected.currentStock} {selected.unit}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !fromWarehouseId || !toWarehouseId || hasInvalidQuantities}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create material issues
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BulkCommissaryDispatchDialog({
  open,
  onOpenChange,
  warehouses,
  items,
  branches,
}: BulkTransferToBranchDialogProps) {
  const commissaryOnly = warehouses.filter((w) => w.warehouseType === "COMMISSARY");
  const commissaryIds = new Set(commissaryOnly.map((w) => w.id));
  const dispatchItems = items.filter(
    (i) => commissaryIds.has(i.warehouseId) && i.itemStage === "BRANCH_READY",
  );
  return (
    <BulkTransferToBranchDialog
      open={open}
      onOpenChange={onOpenChange}
      warehouses={commissaryOnly}
      items={dispatchItems}
      branches={branches}
      title="Bulk commissary dispatch"
      description="Ship branch-ready portions from commissary to stores. Each line needs approval on the Approvals tab, then mark shipped."
      branchReadyItemsOnly
    />
  );
}
