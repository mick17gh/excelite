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
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { recordWarehouseInbound, recordWarehouseWaste, bulkCreateWarehouseItems } from "@/lib/actions/warehouse";
import { getSuppliers, createSupplier } from "@/lib/actions/inventory";

interface WarehouseData {
  id: string;
  name: string;
}

interface WarehouseItem {
  id: string;
  warehouseId: string;
  name: string;
  sku: string;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
}

// ─── Supplier Receiving Dialog ────────────────────────────────────────

interface SupplierReceivingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: WarehouseData[];
  items: WarehouseItem[];
}

export function SupplierReceivingDialog({ open, onOpenChange, warehouses, items }: SupplierReceivingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [itemId, setItemId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");

  const filteredItems = items.filter((i) => !warehouseId || i.warehouseId === warehouseId);

  const loadSuppliers = async () => {
    const result = await getSuppliers();
    if (result.success && result.data) setSuppliers(result.data);
  };

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) {
      toast.error("Please enter supplier name");
      return;
    }
    setIsSubmitting(true);
    const code = newSupplierName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) + "-" + Date.now().toString(36).slice(-4).toUpperCase();
    const result = await createSupplier({ name: newSupplierName.trim(), code });
    if (result.success && result.data) {
      toast.success("Supplier added");
      setSuppliers([...suppliers, result.data]);
      setSupplierId(result.data.id);
      setNewSupplierName("");
      setShowAddSupplier(false);
    } else {
      toast.error(result.error || "Failed to add supplier");
    }
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!warehouseId || !itemId || !supplierId || quantity <= 0 || unitCost <= 0) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    const result = await recordWarehouseInbound({
      warehouseId,
      warehouseItemId: itemId,
      supplierId,
      quantity,
      unitCost,
      invoiceNumber: invoiceNumber || undefined,
      notes: notes || undefined,
    });

    if (result.data) {
      toast.success("Supplier delivery recorded");
      onOpenChange(false);
      setWarehouseId("");
      setItemId("");
      setSupplierId("");
      setQuantity(0);
      setUnitCost(0);
      setInvoiceNumber("");
      setNotes("");
    } else {
      toast.error(result.error || "Failed to record delivery");
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) loadSuppliers(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Receive from Supplier</DialogTitle>
          <DialogDescription>Record a new delivery from supplier to warehouse</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Warehouse *</Label>
            <Select value={warehouseId} onValueChange={(v) => { setWarehouseId(v); setItemId(""); }}>
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
              options={filteredItems.map((i) => ({ value: i.id, label: i.name, description: i.sku }))}
              value={itemId}
              onValueChange={setItemId}
              placeholder="Select item"
              searchPlaceholder="Search items..."
              emptyText="No items found"
              disabled={!warehouseId}
            />
          </div>
          <div className="grid gap-2">
            <Label>Supplier *</Label>
            <div className="flex gap-2">
              <Combobox
                options={suppliers.map((s) => ({ value: s.id, label: s.name, description: s.code }))}
                value={supplierId}
                onValueChange={setSupplierId}
                placeholder="Select supplier"
                searchPlaceholder="Search suppliers..."
                emptyText="No suppliers found"
                className="flex-1"
              />
              <Button type="button" size="icon" variant="outline" onClick={() => setShowAddSupplier(true)} title="Add new supplier">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Quantity *</Label>
              <Input type="number" step="0.01" value={quantity || ""} onChange={(e) => setQuantity(Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>Unit Cost *</Label>
              <Input type="number" step="0.01" value={unitCost || ""} onChange={(e) => setUnitCost(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Invoice Number</Label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-001234" />
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Delivery notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Delivery
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Add Supplier Dialog */}
      <Dialog open={showAddSupplier} onOpenChange={setShowAddSupplier}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>Create a new supplier for receiving inventory</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Supplier Name *</Label>
              <Input 
                value={newSupplierName} 
                onChange={(e) => setNewSupplierName(e.target.value)} 
                placeholder="Enter supplier name"
                onKeyDown={(e) => e.key === "Enter" && handleAddSupplier()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSupplier(false)}>Cancel</Button>
            <Button onClick={handleAddSupplier} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

// ─── Wastage Dialog ────────────────────────────────────────────────────

interface WastageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: WarehouseData[];
  items: WarehouseItem[];
}

export function WastageDialog({ open, onOpenChange, warehouses, items }: WastageDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const filteredItems = items.filter((i) => !warehouseId || i.warehouseId === warehouseId);

  const handleSubmit = async () => {
    if (!warehouseId || !itemId || quantity <= 0 || !reason) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    const result = await recordWarehouseWaste({
      warehouseId,
      warehouseItemId: itemId,
      quantity,
      reason,
      notes: notes || undefined,
    });

    if (result.data) {
      toast.success("Wastage logged");
      onOpenChange(false);
      setWarehouseId("");
      setItemId("");
      setQuantity(0);
      setReason("");
      setNotes("");
    } else {
      toast.error(result.error || "Failed to log wastage");
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Warehouse Wastage</DialogTitle>
          <DialogDescription>Record wasted or damaged inventory</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Warehouse *</Label>
            <Select value={warehouseId} onValueChange={(v) => { setWarehouseId(v); setItemId(""); }}>
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
              options={filteredItems.map((i) => ({ value: i.id, label: i.name, description: i.sku }))}
              value={itemId}
              onValueChange={setItemId}
              placeholder="Select item"
              searchPlaceholder="Search items..."
              emptyText="No items found"
              disabled={!warehouseId}
            />
          </div>
          <div className="grid gap-2">
            <Label>Quantity Wasted *</Label>
            <Input type="number" step="0.01" value={quantity || ""} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <div className="grid gap-2">
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="DAMAGED">Damaged</SelectItem>
                <SelectItem value="SPOILED">Spoiled</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Additional details" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} variant="destructive">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log Wastage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
