"use client";

import { useState, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Plus, Minus, Trash2, Loader2, ChevronsUpDown, Check, UserPlus, ChefHat } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { createOrder } from "@/lib/actions/orders";
import { createCustomer } from "@/lib/actions/customers";
import { useCurrency } from "@/contexts/currency-context";
import { cn } from "@/lib/utils";

interface Branch {
  id: string;
  name: string;
  code: string;
  taxRate: number;
  taxEnabled: boolean;
  taxName: string;
}

interface MenuItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  categoryId: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface CartItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  menuItems: MenuItem[];
  customers: Customer[];
}

export function CreateOrderDialog({ open, onOpenChange, branches, menuItems, customers }: CreateOrderDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [source, setSource] = useState("WALK_IN");
  const [type, setType] = useState("DINE_IN");
  const [customerId, setCustomerId] = useState("walk-in");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchItem, setSearchItem] = useState("");
  const [discountStr, setDiscountStr] = useState("");
  const [deliveryFeeStr, setDeliveryFeeStr] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [sendToKitchen, setSendToKitchen] = useState(false);
  const { formatCurrency } = useCurrency();

  // Customer combobox state
  const [customerOpen, setCustomerOpen] = useState(false);
  const [localCustomers, setLocalCustomers] = useState<Customer[]>(customers);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const selectedCustomerLabel = useMemo(() => {
    if (customerId === "walk-in") return "Walk-in Customer";
    const c = localCustomers.find((c) => c.id === customerId);
    return c ? `${c.name} (${c.phone})` : "Walk-in Customer";
  }, [customerId, localCustomers]);

  const handleCreateCustomer = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    setIsCreatingCustomer(true);
    try {
      const result = await createCustomer({ name: newName.trim(), phone: newPhone.trim() });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.data) {
        const newCustomer = { id: result.data.id, name: result.data.name, phone: result.data.phone };
        setLocalCustomers((prev) => [newCustomer, ...prev]);
        setCustomerId(result.data.id);
        toast.success(`Customer "${result.data.name}" created`);
        setShowNewCustomer(false);
        setNewName("");
        setNewPhone("");
        setCustomerOpen(false);
      }
    } catch {
      toast.error("Failed to create customer");
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const filteredMenuItems = menuItems.filter(
    (item) =>
      !searchItem ||
      item.name.toLowerCase().includes(searchItem.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchItem.toLowerCase())
  );

  const subtotal = Math.round(cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100) / 100;
  const discount = Math.round((parseFloat(discountStr) || 0) * 100) / 100;
  const deliveryFee = Math.round((parseFloat(deliveryFeeStr) || 0) * 100) / 100;
  const isDelivery = type === "DELIVERY";

  // Calculate tax based on selected branch
  const selectedBranch = branches.find((b) => b.id === branchId);
  const taxRate = selectedBranch?.taxEnabled ? (selectedBranch.taxRate / 100) : 0;
  const taxableAmount = subtotal - discount;
  const tax = Math.round((taxableAmount > 0 ? taxableAmount * taxRate : 0) * 100) / 100;
  const total = Math.round((subtotal + tax - discount + (isDelivery ? deliveryFee : 0)) * 100) / 100;

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, unitPrice: item.price }];
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  };

  const handleSubmit = async () => {
    if (!branchId) {
      toast.error("Please select a branch");
      return;
    }
    if (cart.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createOrder({
        branchId,
        source: source as any,
        type: type as any,
        customerId: customerId && customerId !== "walk-in" ? customerId : undefined,
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          notes: c.notes,
        })),
        notes: notes || undefined,
        discount,
        deliveryFee: isDelivery ? deliveryFee : 0,
        deliveryAddress: isDelivery ? deliveryAddress : undefined,
        deliveryPhone: isDelivery ? deliveryPhone : undefined,
        deliveryNotes: isDelivery ? deliveryNotes : undefined,
        sendToKitchen,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Order created successfully");
        resetForm();
        onOpenChange(false);
      }
    } catch {
      toast.error("Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setBranchId("");
    setSource("WALK_IN");
    setType("DINE_IN");
    setCustomerId("walk-in");
    setNotes("");
    setCart([]);
    setSearchItem("");
    setDiscountStr("");
    setDeliveryFeeStr("");
    setDeliveryAddress("");
    setDeliveryPhone("");
    setDeliveryNotes("");
    setSendToKitchen(false);
    setShowNewCustomer(false);
    setNewName("");
    setNewPhone("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>Add a new order with items, customer, and delivery details</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Order Info Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Branch *</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Customer</Label>
              <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={customerOpen} className="justify-between font-normal">
                    <span className="truncate">{selectedCustomerLabel}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  {!showNewCustomer ? (
                    <Command>
                      <CommandInput placeholder="Search customers..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="walk-in"
                            onSelect={() => { setCustomerId("walk-in"); setCustomerOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", customerId === "walk-in" ? "opacity-100" : "opacity-0")} />
                            Walk-in Customer
                          </CommandItem>
                          {localCustomers.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.name} ${c.phone}`}
                              onSelect={() => { setCustomerId(c.id); setCustomerOpen(false); }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", customerId === c.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span>{c.name}</span>
                                <span className="text-xs text-muted-foreground">{c.phone}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup>
                          <CommandItem onSelect={() => setShowNewCustomer(true)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add New Customer
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  ) : (
                    <div className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">New Customer</Label>
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowNewCustomer(false)}>
                          Cancel
                        </Button>
                      </div>
                      <Input placeholder="Customer name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                      <Input placeholder="Phone number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                      <Button size="sm" className="w-full" onClick={handleCreateCustomer} disabled={isCreatingCustomer || !newName.trim() || !newPhone.trim()}>
                        {isCreatingCustomer ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <UserPlus className="mr-2 h-3 w-3" />}
                        {isCreatingCustomer ? "Creating..." : "Create & Select"}
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WALK_IN">Walk-in</SelectItem>
                  <SelectItem value="CALL_CENTER">Call Center</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="POS">POS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Order Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DINE_IN">Dine In</SelectItem>
                  <SelectItem value="TAKEOUT">Takeout</SelectItem>
                  <SelectItem value="DELIVERY">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Send to Kitchen toggle */}
          <div className="flex items-center justify-between rounded-lg border px-3 py-2 bg-muted/20">
            <div className="flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Send to Kitchen</p>
                <p className="text-xs text-muted-foreground">Create a kitchen ticket for this order</p>
              </div>
            </div>
            <Switch checked={sendToKitchen} onCheckedChange={setSendToKitchen} />
          </div>

          {/* Menu Items Search + Cart */}
          <div className="grid gap-2">
            <Label>Items *</Label>
            <Input
              placeholder="Search menu items..."
              value={searchItem}
              onChange={(e) => setSearchItem(e.target.value)}
            />
            {searchItem && (
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {filteredMenuItems.slice(0, 10).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => {
                      addToCart(item);
                      setSearchItem("");
                    }}
                  >
                    <span>{item.name} <span className="text-muted-foreground">({item.sku})</span></span>
                    <span className="font-medium">{formatCurrency(item.price)}</span>
                  </button>
                ))}
                {filteredMenuItems.length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No items found</p>
                )}
              </div>
            )}
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="border rounded-md divide-y">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex items-center justify-between px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{formatCurrency(item.unitPrice)} each</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.menuItemId, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.menuItemId, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-medium w-20 text-right">{formatCurrency(item.quantity * item.unitPrice)}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeFromCart(item.menuItemId)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="px-3 py-2 text-sm font-medium text-right">
                Subtotal: {formatCurrency(subtotal)}
              </div>
            </div>
          )}

          {/* Delivery Fields */}
          {isDelivery && (
            <div className="grid gap-3 border rounded-md p-3">
              <p className="text-sm font-medium">Delivery Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label className="text-xs">Delivery Address</Label>
                  <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Address" />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Delivery Phone</Label>
                  <Input value={deliveryPhone} onChange={(e) => setDeliveryPhone(e.target.value)} placeholder="Phone" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label className="text-xs">Delivery Fee</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    value={deliveryFeeStr}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setDeliveryFeeStr(v);
                    }}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Delivery Notes</Label>
                  <Input value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="Instructions" />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Discount</Label>
              <Input
                inputMode="decimal"
                placeholder="0.00"
                value={discountStr}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setDiscountStr(v);
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={1} placeholder="Order notes" />
            </div>
          </div>

          {/* Order Summary */}
          {cart.length > 0 && (
            <div className="border rounded-md p-3 space-y-1 bg-muted/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-red-500">-{formatCurrency(discount)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({selectedBranch?.taxName || "VAT"} {selectedBranch?.taxRate}%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              {isDelivery && deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              <div className="border-t pt-1 mt-1 flex justify-between text-sm font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
