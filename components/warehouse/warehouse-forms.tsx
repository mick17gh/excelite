"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createWarehouse, createWarehouseItem, createWarehouseTransfer } from "@/lib/actions/warehouse";
import { Combobox } from "@/components/ui/combobox";
import { UNIT_TYPES, UNIT_LABELS } from "@/lib/constants/units";
import { INVENTORY_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants/categories";

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

export function CreateWarehouseDialog({ open, onOpenChange }: CreateWarehouseDialogProps) {
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
        setName(""); setCode(""); setAddress(""); setCity(""); setPhone(""); setEmail("");
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
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Warehouse" />
            </div>
            <div className="grid gap-2">
              <Label>Code *</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WH-001" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Address *</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Warehouse address" />
          </div>
          <div className="grid gap-2">
            <Label>City *</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
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

export function CreateWarehouseItemDialog({ open, onOpenChange, warehouses }: CreateWarehouseItemDialogProps) {
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
        setName(""); setSku(""); setUnitCost(0); setCurrentStock(0);
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
          <DialogDescription>Add inventory item to a warehouse</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Warehouse *</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" />
            </div>
            <div className="grid gap-2">
              <Label>SKU *</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="WH-ITEM-001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Input type="number" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>Current Stock</Label>
              <Input type="number" value={currentStock} onChange={(e) => setCurrentStock(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Min Stock</Label>
              <Input type="number" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>Reorder Point</Label>
              <Input type="number" value={reorderPoint} onChange={(e) => setReorderPoint(Number(e.target.value))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
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

export function CreateTransferDialog({ open, onOpenChange, warehouses, items, branches }: CreateTransferDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouseItemId, setWarehouseItemId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState("");

  const filteredItems = items.filter((i) => !warehouseId || i.warehouseId === warehouseId);

  const handleSubmit = async () => {
    if (!warehouseId || !warehouseItemId || !toBranchId || quantity <= 0) {
      toast.error("All fields are required and quantity must be > 0");
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
        setWarehouseId(""); setWarehouseItemId(""); setToBranchId(""); setQuantity(0); setNotes("");
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
          <DialogDescription>Transfer stock from warehouse to branch</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>From Warehouse *</Label>
            <Select value={warehouseId} onValueChange={(v) => { setWarehouseId(v); setWarehouseItemId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Item *</Label>
            <Combobox
              options={filteredItems.map((i) => ({ value: i.id, label: i.name, description: `${i.sku} — Stock: ${i.currentStock}` }))}
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
              options={branches.map((b) => ({ value: b.id, label: b.name, description: b.code }))}
              value={toBranchId}
              onValueChange={setToBranchId}
              placeholder="Select branch"
              searchPlaceholder="Search branches..."
              emptyText="No branches found"
            />
          </div>
          <div className="grid gap-2">
            <Label>Quantity *</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Transfer notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
