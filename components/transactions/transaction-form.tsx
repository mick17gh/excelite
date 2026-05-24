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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Receipt } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { createTransaction } from "@/lib/actions/transactions";
import { getBranchTaxRate } from "@/lib/actions/tax";
import { computeOrderTaxAmounts } from "@/lib/services/tax-calculation";
import { SalesChannel } from "@/lib/generated/prisma/client";

interface Branch {
  id: string;
  name: string;
  code: string;
  currency?: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  menuItems: MenuItem[];
}

interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export function RecordTransactionForm({
  open,
  onOpenChange,
  branches,
  menuItems,
}: TransactionFormProps) {
  const { formatCurrency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    branchId: "",
    channel: "DINE_IN",
    paymentMethod: "CASH",
    customerName: "",
    notes: "",
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [taxSettings, setTaxSettings] = useState({
    rate: 12.5,
    name: "VAT",
    enabled: true,
    inclusive: false,
  });

  useEffect(() => {
    if (!formData.branchId) return;
    void getBranchTaxRate(formData.branchId).then(setTaxSettings);
  }, [formData.branchId]);

  const addItem = () => {
    if (!selectedItem || !quantity) return;

    const menuItem = menuItems.find((m) => m.id === selectedItem);
    if (!menuItem) return;

    const qty = parseInt(quantity);
    const existingIndex = orderItems.findIndex(
      (i) => i.menuItemId === selectedItem
    );

    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].total =
        updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setOrderItems(updated);
    } else {
      setOrderItems([
        ...orderItems,
        {
          menuItemId: menuItem.id,
          name: menuItem.name,
          quantity: qty,
          unitPrice: menuItem.price,
          total: qty * menuItem.price,
        },
      ]);
    }

    setSelectedItem("");
    setQuantity("1");
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const lineTotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  const { subtotal, tax, total } = computeOrderTaxAmounts({
    lineTotal,
    ratePercent: taxSettings.rate,
    enabled: taxSettings.enabled,
    inclusive: taxSettings.inclusive,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.branchId) {
      toast.error("Please select a branch");
      return;
    }

    if (orderItems.length === 0) {
      toast.error("Please add at least one item to the order");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createTransaction({
        branchId: formData.branchId,
        channel: formData.channel as SalesChannel,
        paymentMethod: formData.paymentMethod,
        items: orderItems.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitCost: item.unitPrice * 0.4, // Estimate cost at 40% of price
        })),
      });

      if (result.success) {
        toast.success("Transaction recorded successfully", {
          description: `Order total: ${formatCurrency(total)}`,
        });
        onOpenChange(false);
        setFormData({
          branchId: "",
          channel: "DINE_IN",
          paymentMethod: "CASH",
          customerName: "",
          notes: "",
        });
        setOrderItems([]);
      } else {
        toast.error(result.error || "Failed to record transaction");
      }
    } catch (error) {
      console.error("Error recording transaction:", error);
      toast.error("Failed to record transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Record Transaction
          </DialogTitle>
          <DialogDescription>
            Record a new sale transaction for your branch
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 px-6 py-4">
            {/* Branch and Order Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="branch">Branch *</Label>
                <Select
                  value={formData.branchId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, branchId: value })
                  }
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
                <Label htmlFor="channel">Sales Channel</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value) =>
                    setFormData({ ...formData, channel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DINE_IN">Dine In</SelectItem>
                    <SelectItem value="TAKEAWAY">Takeaway</SelectItem>
                    <SelectItem value="DELIVERY">Delivery</SelectItem>
                    <SelectItem value="ONLINE">Online Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Add Items Section */}
            <div className="space-y-3">
              <Label>Order Items</Label>
              <div className="flex gap-2">
                <Select value={selectedItem} onValueChange={setSelectedItem}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select menu item" />
                  </SelectTrigger>
                  <SelectContent>
                    {menuItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} - {formatCurrency(item.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-20"
                  placeholder="Qty"
                />
                <Button type="button" variant="secondary" onClick={addItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Order Items List */}
              {orderItems.length > 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {orderItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} × {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-medium">
                              {formatCurrency(item.total)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
                  No items added yet. Select items from the menu above.
                </div>
              )}
            </div>

            {/* Order Summary */}
            {orderItems.length > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>VAT (12.5%)</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) =>
                    setFormData({ ...formData, paymentMethod: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customerName">Customer Name (Optional)</Label>
                <Input
                  id="customerName"
                  placeholder="Enter customer name"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions or notes..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || orderItems.length === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Sale ({formatCurrency(total)})
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
