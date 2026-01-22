"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Plus } from "lucide-react";
import {
  recordInbound,
  recordOutbound,
  recordWaste,
  transferStock,
  createInventoryItem,
  getSuppliers,
  createSupplier,
} from "@/lib/actions/inventory";
import { StockMovementType, InventoryCategory, UnitType } from "@/lib/generated/prisma/client";

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
  branchName: string;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
}

// Inbound Stock Form
interface InboundFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  items: InventoryItem[];
}

export function InboundStockForm({ open, onOpenChange, branches, items }: InboundFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [formData, setFormData] = useState({
    branchId: "",
    itemId: "",
    supplierId: "",
    quantity: "",
    unitCost: "",
    supplierInvoice: "",
    notes: "",
  });

  // Load suppliers when dialog opens
  useEffect(() => {
    if (open) {
      loadSuppliers();
    }
  }, [open]);

  const loadSuppliers = async () => {
    setIsLoadingSuppliers(true);
    try {
      const result = await getSuppliers();
      if (result.success && result.data) {
        setSuppliers(result.data);
      }
    } catch (error) {
      console.error("Error loading suppliers:", error);
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) {
      toast.error("Please enter a supplier name");
      return;
    }

    setIsSubmitting(true);
    try {
      const code = newSupplierName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6) + "-" + Date.now().toString(36).slice(-4).toUpperCase();
      
      const result = await createSupplier({
        name: newSupplierName.trim(),
        code,
      });

      if (result.success && result.data) {
        toast.success("Supplier added successfully");
        setSuppliers([...suppliers, result.data]);
        setFormData({ ...formData, supplierId: result.data.id });
        setNewSupplierName("");
        setShowNewSupplier(false);
      } else {
        toast.error(result.error || "Failed to add supplier");
      }
    } catch (error) {
      console.error("Error adding supplier:", error);
      toast.error("Failed to add supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplierId) {
      toast.error("Please select a supplier");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await recordInbound({
        branchId: formData.branchId,
        itemId: formData.itemId,
        supplierId: formData.supplierId,
        quantity: parseFloat(formData.quantity),
        unitCost: parseFloat(formData.unitCost),
        invoiceNumber: formData.supplierInvoice || undefined,
        notes: formData.notes || undefined,
      });

      if (result.success) {
        toast.success("Inbound stock recorded successfully");
        onOpenChange(false);
        setFormData({
          branchId: "",
          itemId: "",
          supplierId: "",
          quantity: "",
          unitCost: "",
          supplierInvoice: "",
          notes: "",
        });
      } else {
        toast.error(result.error || "Failed to record inbound stock");
      }
    } catch (error) {
      console.error("Error recording inbound stock:", error);
      toast.error("Failed to record inbound stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Inbound Stock</DialogTitle>
          <DialogDescription>
            Record a new stock delivery from supplier
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="supplier">Supplier</Label>
                {showNewSupplier ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Supplier name"
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddSupplier}
                      disabled={isSubmitting}
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowNewSupplier(false);
                        setNewSupplierName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select
                      value={formData.supplierId}
                      onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={isLoadingSuppliers ? "Loading..." : "Select supplier"} />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setShowNewSupplier(true)}
                      title="Add new supplier"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
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

            <div className="grid gap-2">
              <Label htmlFor="invoice">Supplier Invoice #</Label>
              <Input
                id="invoice"
                placeholder="INV-001234"
                value={formData.supplierInvoice}
                onChange={(e) => setFormData({ ...formData, supplierInvoice: e.target.value })}
              />
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Inbound
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Outbound Stock</DialogTitle>
          <DialogDescription>
            Record stock usage or removal from inventory
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 px-6 py-4">
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
          <DialogFooter>
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
        toast.success("Waste log recorded successfully");
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
        toast.error(result.error || "Failed to record waste");
      }
    } catch (error) {
      console.error("Error recording waste:", error);
      toast.error("Failed to record waste");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Waste</DialogTitle>
          <DialogDescription>
            Log wasted or spoiled inventory items
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 px-6 py-4">
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
                <Label htmlFor="quantity">Quantity Wasted</Label>
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
                <Label htmlFor="wasteType">Waste Type</Label>
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
                placeholder="Explain why this was wasted"
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} variant="destructive">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Waste
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        toast.success("Transfer initiated successfully");
        onOpenChange(false);
        setFormData({
          fromBranchId: "",
          toBranchId: "",
          itemId: "",
          quantity: "",
          notes: "",
        });
      } else {
        toast.error(result.error || "Failed to transfer stock");
      }
    } catch (error) {
      console.error("Error transferring stock:", error);
      toast.error("Failed to transfer stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transfer Stock</DialogTitle>
          <DialogDescription>
            Transfer inventory between branches
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fromBranch">From Branch</Label>
                <Select
                  value={formData.fromBranchId}
                  onValueChange={(value) => setFormData({ ...formData, fromBranchId: value })}
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
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Destination" />
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

            <div className="grid gap-2">
              <Label htmlFor="item">Item to Transfer</Label>
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

            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity to Transfer</Label>
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
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Reason for transfer..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Initiate Transfer
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
}

export function AddInventoryItemForm({ open, onOpenChange, branches }: AddItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "FOOD",
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
        category: formData.category as InventoryCategory,
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
          category: "FOOD",
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
          <DialogDescription>
            Create a new inventory item to track
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 px-6 py-4">
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
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FOOD">Food</SelectItem>
                    <SelectItem value="BEVERAGE">Beverage</SelectItem>
                    <SelectItem value="PACKAGING">Packaging</SelectItem>
                    <SelectItem value="CLEANING">Cleaning</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
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
                    <SelectItem value="KG">Kilogram</SelectItem>
                    <SelectItem value="LITER">Liter</SelectItem>
                    <SelectItem value="PIECE">Piece</SelectItem>
                    <SelectItem value="BOX">Box</SelectItem>
                    <SelectItem value="CASE">Case</SelectItem>
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
          <DialogFooter>
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
