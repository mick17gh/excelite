"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  recordOutbound,
  recordWaste,
  transferStock,
  createInventoryItem,
} from "@/lib/actions/inventory";
import { createBranchToWarehouseTransfer } from "@/lib/actions/stock-transfers";
import { StockMovementType, UnitType } from "@/lib/generated/prisma/client";
import { UNIT_TYPES, UNIT_LABELS } from "@/lib/constants/units";

interface InventoryCategoryOption {
  id: string;
  name: string;
  code: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  branchId: string;
  branchName: string;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
}

// Outbound Stock Form
interface OutboundFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  items: InventoryItem[];
}

export function OutboundStockForm({ open, onOpenChange, branches, items }: OutboundFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    branchId: "",
    itemId: "",
    quantity: "",
    reason: "USAGE",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await recordOutbound({
        branchId: formData.branchId,
        itemId: formData.itemId,
        quantity: parseFloat(formData.quantity),
        movementType: "OUTBOUND_SALE" as StockMovementType,
        reason: formData.reason,
        reference: formData.notes || undefined,
      });

      if (result.success) {
        toast.success("Outbound stock recorded successfully");
        onOpenChange(false);
        setFormData({
          branchId: "",
          itemId: "",
          quantity: "",
          reason: "USAGE",
          notes: "",
        });
      } else {
        toast.error(result.error || "Failed to record outbound stock");
      }
    } catch (error) {
      console.error("Error recording outbound stock:", error);
      toast.error("Failed to record outbound stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[min(90vh,900px)] flex flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Record Outbound Stock</DialogTitle>
          <DialogDescription>
            Record stock usage or removal from inventory
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="branch">Branch</Label>
              <Select
                value={formData.branchId}
                onValueChange={(value) => setFormData({ ...formData, branchId: value })}
              >
                <SelectTrigger>
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

            <div className="grid gap-2">
              <Label htmlFor="item">Item</Label>
              <Select
                value={formData.itemId}
                onValueChange={(value) => setFormData({ ...formData, itemId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - {item.currentStock} {item.unit} available
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Reason</Label>
                <Select
                  value={formData.reason}
                  onValueChange={(value) => setFormData({ ...formData, reason: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USAGE">Normal Usage</SelectItem>
                    <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                    <SelectItem value="RETURN">Return to Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Outbound
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Waste Log Form
interface WasteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  items: InventoryItem[];
}

export function WasteLogForm({ open, onOpenChange, branches, items }: WasteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    branchId: "",
    itemId: "",
    quantity: "",
    wasteType: "EXPIRED",
    reason: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await recordWaste({
        branchId: formData.branchId,
        itemId: formData.itemId,
        quantity: parseFloat(formData.quantity),
        reason: `${formData.wasteType}: ${formData.reason}`,
        notes: formData.notes || undefined,
      });

      if (result.success) {
        toast.success("Loss recorded successfully");
        onOpenChange(false);
        setFormData({
          branchId: "",
          itemId: "",
          quantity: "",
          wasteType: "EXPIRED",
          reason: "",
          notes: "",
        });
      } else {
        toast.error(result.error || "Failed to record loss");
      }
    } catch (error) {
      console.error("Error recording loss:", error);
      toast.error("Failed to record loss");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[min(90vh,900px)] flex flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Record Loss</DialogTitle>
          <DialogDescription>
            Record lost or spoiled inventory items
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="branch">Branch</Label>
              <Select
                value={formData.branchId}
                onValueChange={(value) => setFormData({ ...formData, branchId: value })}
              >
                <SelectTrigger>
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

            <div className="grid gap-2">
              <Label htmlFor="item">Item</Label>
              <Select
                value={formData.itemId}
                onValueChange={(value) => setFormData({ ...formData, itemId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity Lost</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wasteType">Loss Type</Label>
                <Select
                  value={formData.wasteType}
                  onValueChange={(value) => setFormData({ ...formData, wasteType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                    <SelectItem value="SPOILED">Spoiled</SelectItem>
                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                    <SelectItem value="PREPARATION">Prep Waste</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                placeholder="Explain why this was lost"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional details..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} variant="destructive">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Loss
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Transfer Form
interface TransferFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  items: InventoryItem[];
}

export function TransferForm({ open, onOpenChange, branches, items }: TransferFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fromBranchId: "",
    toBranchId: "",
    itemId: "",
    quantity: "",
    notes: "",
  });

  // Filter items by selected source branch
  const branchItems = formData.fromBranchId
    ? items.filter((item) => item.branchId === formData.fromBranchId && item.currentStock > 0)
    : [];

  // Filter destination branches (exclude source)
  const destBranches = branches.filter((b) => b.id !== formData.fromBranchId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fromBranchId || !formData.toBranchId) {
      toast.error("Please select both source and destination branches");
      return;
    }

    if (formData.fromBranchId === formData.toBranchId) {
      toast.error("Source and destination branches must be different");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await transferStock({
        fromBranchId: formData.fromBranchId,
        toBranchId: formData.toBranchId,
        itemId: formData.itemId,
        quantity: parseFloat(formData.quantity),
        notes: formData.notes || undefined,
      });

      if (result.success) {
        toast.success("Transfer request created (pending approval)");
        onOpenChange(false);
        setFormData({
          fromBranchId: "",
          toBranchId: "",
          itemId: "",
          quantity: "",
          notes: "",
        });
      } else {
        toast.error(result.error || "Failed to create transfer request");
      }
    } catch (error) {
      console.error("Error creating transfer:", error);
      toast.error("Failed to create transfer request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[min(90vh,900px)] flex flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Transfer Stock Between Branches</DialogTitle>
          <DialogDescription>
            Create a transfer request. It will need to be approved and marked as received before stock moves.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fromBranch">From Branch</Label>
                <Select
                  value={formData.fromBranchId}
                  onValueChange={(value) => setFormData({ ...formData, fromBranchId: value, itemId: "", quantity: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
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
              <div className="grid gap-2">
                <Label htmlFor="toBranch">To Branch</Label>
                <Select
                  value={formData.toBranchId}
                  onValueChange={(value) => setFormData({ ...formData, toBranchId: value })}
                  disabled={!formData.fromBranchId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {destBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="item">Item to Transfer</Label>
              <Select
                value={formData.itemId}
                onValueChange={(value) => setFormData({ ...formData, itemId: value })}
                disabled={!formData.fromBranchId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.fromBranchId ? "Select item" : "Select source branch first"} />
                </SelectTrigger>
                <SelectContent>
                  {branchItems.length === 0 ? (
                    <SelectItem value="__none" disabled>No items with stock at this branch</SelectItem>
                  ) : (
                    branchItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.sku}) — {item.currentStock} {item.unit}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity to Transfer</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Reason for transfer..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.itemId}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Transfer Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Inventory Item Form
interface AddItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  categories: InventoryCategoryOption[];
}

export function AddInventoryItemForm({ open, onOpenChange, branches, categories }: AddItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    categoryId: "",
    unit: "KG",
    unitCost: "",
    currentStock: "",
    minStock: "",
    maxStock: "",
    reorderPoint: "",
    branchId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await createInventoryItem({
        name: formData.name,
        sku: formData.sku,
        categoryId: formData.categoryId,
        unit: formData.unit as UnitType,
        unitCost: parseFloat(formData.unitCost),
        currentStock: formData.currentStock ? parseFloat(formData.currentStock) : 0,
        minStock: parseFloat(formData.minStock),
        maxStock: parseFloat(formData.maxStock),
        reorderPoint: parseFloat(formData.reorderPoint),
        branchId: formData.branchId,
      });

      if (result.success) {
        toast.success("Inventory item added successfully");
        onOpenChange(false);
        setFormData({
          name: "",
          sku: "",
          categoryId: "",
          unit: "KG",
          unitCost: "",
          currentStock: "",
          minStock: "",
          maxStock: "",
          reorderPoint: "",
          branchId: "",
        });
      } else {
        toast.error(result.error || "Failed to add inventory item");
      }
    } catch (error) {
      console.error("Error adding inventory item:", error);
      toast.error("Failed to add inventory item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[min(90vh,900px)] flex flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Add Inventory Item</DialogTitle>
          <DialogDescription>
            Create a new inventory item to track
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Item Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Chicken Breast"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  placeholder="e.g., CHKN-001"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
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
              <div className="grid gap-2">
                <Label htmlFor="unitCost">Unit Cost (GH₵)</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.unitCost}
                  onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="currentStock">Initial Stock</Label>
                <Input
                  id="currentStock"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minStock">Min Stock</Label>
                <Input
                  id="minStock"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxStock">Max Stock</Label>
                <Input
                  id="maxStock"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.maxStock}
                  onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.reorderPoint}
                  onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="branch">Branch</Label>
              <Select
                value={formData.branchId}
                onValueChange={(value) => setFormData({ ...formData, branchId: value })}
              >
                <SelectTrigger>
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
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

interface BranchReturnToWarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  warehouses: WarehouseOption[];
  items: InventoryItem[];
  onCreated?: () => void;
}

export function BranchReturnToWarehouseDialog({
  open,
  onOpenChange,
  branches,
  warehouses,
  items,
  onCreated,
}: BranchReturnToWarehouseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fromBranchId, setFromBranchId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [branchItemId, setBranchItemId] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState("");

  const branchItems = items.filter((i) => !fromBranchId || i.branchId === fromBranchId);

  const handleSubmit = async () => {
    if (!fromBranchId || !toWarehouseId || !branchItemId || quantity <= 0) {
      toast.error("Branch, warehouse, item, and quantity are required");
      return;
    }
    const item = items.find((i) => i.id === branchItemId);
    if (item && quantity > item.currentStock) {
      toast.error("Insufficient branch stock");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await createBranchToWarehouseTransfer({
        fromBranchId,
        toWarehouseId,
        branchItemId,
        quantity,
        notes: notes.trim() || undefined,
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Return transfer created");
        onOpenChange(false);
        onCreated?.();
      }
    } catch {
      toast.error("Failed to create return");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[min(90vh,900px)] flex flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Return stock to warehouse</DialogTitle>
          <DialogDescription>
            Send branch inventory back to a raw or commissary warehouse.
          </DialogDescription>
        </DialogHeader>
        <div className="grid flex-1 gap-3 overflow-y-auto px-6 py-4">
          <div className="grid gap-2">
            <Label>From branch</Label>
            <Select value={fromBranchId} onValueChange={setFromBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>To warehouse</Label>
            <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
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
            <Label>Item</Label>
            <Select value={branchItemId} onValueChange={setBranchItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {branchItems.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} ({i.currentStock} {i.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
