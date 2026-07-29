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
  dashboardModalHeaderClass,
  dashboardModalContentClass,
  dashboardPrimaryButtonClass,
} from "@/components/dashboard/dashboard-theme";
import { cn } from "@/lib/utils";
import {
  recordOutbound,
  recordWaste,
  transferStock,
  createInventoryItem,
} from "@/lib/actions/inventory";
import { createBranchToWarehouseTransfer } from "@/lib/actions/stock-transfers";
import { StockMovementType, UnitType } from "@/lib/generated/prisma/client";
import { UNIT_TYPES, UNIT_LABELS } from "@/lib/constants/units";
import { Combobox } from "@/components/ui/combobox";

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
      <DialogContent className={cn(dashboardModalContentClass, "sm:max-w-[500px]")}>
        <DialogHeader className={cn(dashboardModalHeaderClass, "shrink-0 text-left")}>
          <DialogTitle className="text-white">Record Outbound Stock</DialogTitle>
          <DialogDescription className="text-white/80">
            Record stock usage or removal from inventory
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="branch">Branch</Label>
              <Combobox
                options={branches.map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                }))}
                value={formData.branchId}
                onValueChange={(value) => setFormData({ ...formData, branchId: value })}
                placeholder="Select branch..."
                searchPlaceholder="Search branches..."
                emptyText="No branches found."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="item">Item</Label>
              <Combobox
                options={items.map((item) => ({
                  value: item.id,
                  label: `${item.name} - ${item.currentStock} ${item.unit} available`,
                }))}
                value={formData.itemId}
                onValueChange={(value) => setFormData({ ...formData, itemId: value })}
                placeholder="Select item..."
                searchPlaceholder="Search items..."
                emptyText="No items found."
              />
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
      <DialogContent className={cn(dashboardModalContentClass, "sm:max-w-[500px]")}>
        <DialogHeader className={cn(dashboardModalHeaderClass, "shrink-0 text-left")}>
          <DialogTitle className="text-white">Record Loss</DialogTitle>
          <DialogDescription className="text-white/80">
            Record lost or spoiled inventory items
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="branch">Branch</Label>
              <Combobox
                options={branches.map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                }))}
                value={formData.branchId}
                onValueChange={(value) => setFormData({ ...formData, branchId: value })}
                placeholder="Select branch..."
                searchPlaceholder="Search branches..."
                emptyText="No branches found."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="item">Item</Label>
              <Combobox
                options={items.map((item) => ({
                  value: item.id,
                  label: `${item.name} (${item.sku})`,
                }))}
                value={formData.itemId}
                onValueChange={(value) => setFormData({ ...formData, itemId: value })}
                placeholder="Select item..."
                searchPlaceholder="Search items..."
                emptyText="No items found."
              />
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
      <DialogContent className={cn(dashboardModalContentClass, "sm:max-w-[500px]")}>
        <DialogHeader className={cn(dashboardModalHeaderClass, "shrink-0 text-left")}>
          <DialogTitle className="text-white">Transfer Stock Between Branches</DialogTitle>
          <DialogDescription className="text-white/80">
            Create a transfer request. It will need to be approved and marked as received before stock moves.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fromBranch">From Branch</Label>
                <Combobox
                  options={branches.map((branch) => ({
                    value: branch.id,
                    label: branch.name,
                  }))}
                  value={formData.fromBranchId}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      fromBranchId: value,
                      itemId: "",
                      quantity: "",
                    })
                  }
                  placeholder="Source..."
                  searchPlaceholder="Search branches..."
                  emptyText="No branches found."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="toBranch">To Branch</Label>
                <Combobox
                  options={destBranches.map((branch) => ({
                    value: branch.id,
                    label: branch.name,
                  }))}
                  value={formData.toBranchId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, toBranchId: value })
                  }
                  placeholder="Destination..."
                  searchPlaceholder="Search branches..."
                  emptyText="No branches found."
                  disabled={!formData.fromBranchId}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="item">Item to Transfer</Label>
              <Combobox
                options={branchItems.map((item) => ({
                  value: item.id,
                  label: `${item.name} (${item.sku}) — ${item.currentStock} ${item.unit}`,
                }))}
                value={formData.itemId}
                onValueChange={(value) =>
                  setFormData({ ...formData, itemId: value })
                }
                placeholder={
                  formData.fromBranchId
                    ? "Select item..."
                    : "Select source branch first"
                }
                searchPlaceholder="Search items..."
                emptyText="No items with stock at this branch"
                disabled={!formData.fromBranchId}
              />
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
      <DialogContent className={cn(dashboardModalContentClass, "sm:max-w-[600px]")}>
        <DialogHeader className={cn(dashboardModalHeaderClass, "shrink-0 text-left")}>
          <DialogTitle className="text-white">Add Inventory Item</DialogTitle>
          <DialogDescription className="text-white/80">
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
                <Combobox
                  options={categories.map((category) => ({
                    value: category.id,
                    label: category.code
                      ? `${category.name} (${category.code})`
                      : category.name,
                  }))}
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoryId: value })
                  }
                  placeholder="Select category..."
                  searchPlaceholder="Search categories..."
                  emptyText="No categories found."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Combobox
                  options={UNIT_TYPES.map((unitType) => ({
                    value: unitType,
                    label: UNIT_LABELS[unitType],
                  }))}
                  value={formData.unit}
                  onValueChange={(value) =>
                    setFormData({ ...formData, unit: value })
                  }
                  placeholder="Select unit..."
                  searchPlaceholder="Search units..."
                  emptyText="No units found."
                />
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
              <Combobox
                options={branches.map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                }))}
                value={formData.branchId}
                onValueChange={(value) =>
                  setFormData({ ...formData, branchId: value })
                }
                placeholder="Select branch..."
                searchPlaceholder="Search branches..."
                emptyText="No branches found."
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className={dashboardPrimaryButtonClass}>
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
      <DialogContent className={cn(dashboardModalContentClass, "max-w-md")}>
        <DialogHeader className={cn(dashboardModalHeaderClass, "shrink-0 text-left")}>
          <DialogTitle className="text-white">Return stock to warehouse</DialogTitle>
          <DialogDescription className="text-white/80">
            Send branch inventory back to a raw or commissary warehouse.
          </DialogDescription>
        </DialogHeader>
        <div className="grid flex-1 gap-3 overflow-y-auto px-6 py-4">
          <div className="grid gap-2">
            <Label>From branch</Label>
            <Combobox
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
              value={fromBranchId}
              onValueChange={setFromBranchId}
              placeholder="Select branch..."
              searchPlaceholder="Search branches..."
              emptyText="No branches found."
            />
          </div>
          <div className="grid gap-2">
            <Label>To warehouse</Label>
            <Combobox
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
              value={toWarehouseId}
              onValueChange={setToWarehouseId}
              placeholder="Select warehouse..."
              searchPlaceholder="Search warehouses..."
              emptyText="No warehouses found."
            />
          </div>
          <div className="grid gap-2">
            <Label>Item</Label>
            <Combobox
              options={branchItems.map((i) => ({
                value: i.id,
                label: `${i.name} (${i.currentStock} ${i.unit})`,
              }))}
              value={branchItemId}
              onValueChange={setBranchItemId}
              placeholder="Select item..."
              searchPlaceholder="Search items..."
              emptyText="No items found."
            />
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
