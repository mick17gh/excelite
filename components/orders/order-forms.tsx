"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { isMenuItemVisibleAtBranch } from "@/lib/menu/branch-availability";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Plus,
  Minus,
  Trash2,
  Loader2,
  ChevronsUpDown,
  Check,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { createOrder } from "@/lib/actions/orders";
import { createCustomer } from "@/lib/actions/customers";
import { useCurrency } from "@/contexts/currency-context";
import { cn } from "@/lib/utils";
import {
  type ClientMenuOptionGroup,
  applyDefaultSelections,
  buildLinePreview,
  formatOptionGroupRangeHint,
  posCartLineKey,
  validateOptionSelections,
} from "@/lib/menu-option-client";
import { computeOrderTaxAmounts } from "@/lib/services/tax-calculation";
import { shouldShowTaxBreakdown } from "@/lib/services/receipt-display";
import { useMenuStockAvailability } from "@/hooks/use-menu-stock-availability";
import { validateMenuItemStockForSale } from "@/lib/actions/menu-stock-availability";
import { Badge } from "@/components/ui/badge";

interface Branch {
  id: string;
  name: string;
  code: string;
  taxRate: number;
  taxEnabled: boolean;
  taxName: string;
  taxInclusive?: boolean;
  showTaxOnReceipt?: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  categoryId: string | null;
  optionGroups?: ClientMenuOptionGroup[];
  availableAtAllBranches?: boolean;
  branchIds?: string[];
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface CartItem {
  lineKey: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  menuItemOptionIds: string[];
  configurationLabel: string;
}

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  menuItems: MenuItem[];
  customers: Customer[];
  /** Called after the order is created; await so the dialog can show loading until the detail view is ready */
  onOrderCreated?: (orderId: string) => void | Promise<void>;
}

export function CreateOrderDialog({
  open,
  onOpenChange,
  branches,
  menuItems,
  customers,
  onOrderCreated,
}: CreateOrderDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<"creating" | "opening">("creating");
  const [branchId, setBranchId] = useState("");
  const [source, setSource] = useState("WALK_IN");
  const [type, setType] = useState("DINE_IN");
  const [customerId, setCustomerId] = useState("walk-in");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchItem, setSearchItem] = useState("");
  const [optionPickerOpen, setOptionPickerOpen] = useState(false);
  const [optionPickerItem, setOptionPickerItem] = useState<MenuItem | null>(null);
  const [pickerSelections, setPickerSelections] = useState<Record<string, string[]>>({});
  const [discountStr, setDiscountStr] = useState("");
  const [deliveryFeeStr, setDeliveryFeeStr] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
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
      const result = await createCustomer({
        name: newName.trim(),
        phone: newPhone.trim(),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.data) {
        const newCustomer = {
          id: result.data.id,
          name: result.data.name,
          phone: result.data.phone,
        };
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

  const prevBranchIdRef = useRef<string | null>(null);

  const handleBranchChange = (nextBranchId: string) => {
    if (
      prevBranchIdRef.current &&
      nextBranchId &&
      prevBranchIdRef.current !== nextBranchId
    ) {
      setCart((prev) => {
        const next = prev.filter((line) => {
          const item = menuItems.find((m) => m.id === line.menuItemId);
          if (!item) return false;
          return isMenuItemVisibleAtBranch(
            {
              availableAtAllBranches: item.availableAtAllBranches ?? true,
              branchIds: item.branchIds ?? [],
            },
            nextBranchId
          );
        });
        if (next.length < prev.length) {
          toast.info("Removed items not sold at this branch");
        }
        return next;
      });
    }
    prevBranchIdRef.current = nextBranchId;
    setBranchId(nextBranchId);
  };

  useEffect(() => {
    if (branchId) {
      prevBranchIdRef.current = branchId;
    }
  }, [branchId]);

  const filteredMenuItems = useMemo(() => {
    if (!branchId) return [];
    const q = searchItem.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (
        !isMenuItemVisibleAtBranch(
          {
            availableAtAllBranches: item.availableAtAllBranches ?? true,
            branchIds: item.branchIds ?? [],
          },
          branchId
        )
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
      );
    });
  }, [menuItems, branchId, searchItem]);

  const branchMenuIds = useMemo(() => {
    if (!branchId) return [];
    return menuItems
      .filter((item) =>
        isMenuItemVisibleAtBranch(
          {
            availableAtAllBranches: item.availableAtAllBranches ?? true,
            branchIds: item.branchIds ?? [],
          },
          branchId
        )
      )
      .map((m) => m.id);
  }, [menuItems, branchId]);

  const {
    blocking: stockBlocking,
    unsellableIds,
    isSellable,
    loading: stockLoading,
    refresh: refreshStockAvailability,
  } = useMenuStockAvailability(branchId, branchMenuIds, Boolean(branchId));

  useEffect(() => {
    if (!branchId || !stockBlocking || stockLoading) return;
    setCart((prev) => {
      const next = prev.filter((line) => !unsellableIds.has(line.menuItemId));
      if (next.length < prev.length) {
        toast.info("Removed out-of-stock items from cart");
      }
      return next;
    });
  }, [branchId, stockBlocking, stockLoading, unsellableIds]);

  const lineTotal =
    Math.round(
      cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100,
    ) / 100;
  const discount = Math.round((parseFloat(discountStr) || 0) * 100) / 100;
  const deliveryFee = Math.round((parseFloat(deliveryFeeStr) || 0) * 100) / 100;
  const isDelivery = type === "DELIVERY";

  const selectedBranch = branches.find((b) => b.id === branchId);
  const showTaxBreakdown = shouldShowTaxBreakdown({
    showTaxOnReceipt: selectedBranch?.showTaxOnReceipt,
  });
  const { tax, total } = computeOrderTaxAmounts({
    lineTotal,
    discount,
    deliveryFee: isDelivery ? deliveryFee : 0,
    ratePercent: selectedBranch?.taxRate ?? 12.5,
    enabled: selectedBranch?.taxEnabled ?? true,
    inclusive: selectedBranch?.taxInclusive ?? false,
  });

  const selectionsRecordFromIds = (
    groups: ClientMenuOptionGroup[],
    ids: string[]
  ): Record<string, string[]> => {
    const set = new Set(ids);
    const rec: Record<string, string[]> = {};
    for (const g of groups) {
      const picked = g.options.filter((o) => set.has(o.id)).map((o) => o.id);
      rec[g.id] = g.maxSelections <= 1 ? picked.slice(0, 1) : picked.slice(0, g.maxSelections);
    }
    return rec;
  };

  const flattenPickerSelections = (groups: ClientMenuOptionGroup[], rec: Record<string, string[]>) =>
    groups.flatMap((g) => rec[g.id] || []);

  const commitCartLine = async (item: MenuItem, draftOptionIds: string[]) => {
    const groups = item.optionGroups;
    const withDefs = applyDefaultSelections(groups, draftOptionIds);
    const err = validateOptionSelections(groups, withDefs);
    if (err) {
      toast.error(err);
      return false;
    }
    if (branchId && stockBlocking) {
      const stockResult = await validateMenuItemStockForSale(
        branchId,
        item.id,
        1,
        withDefs
      );
      if (!stockResult.success) {
        toast.error(stockResult.error || "Item is out of stock");
        return false;
      }
    }
    const preview = buildLinePreview(item.price, groups, withDefs);
    const lineKey = posCartLineKey(item.id, preview.configurationKey);
    setCart((prev) => {
      const existing = prev.find((c) => c.lineKey === lineKey);
      if (existing) {
        return prev.map((c) =>
          c.lineKey === lineKey ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          lineKey,
          menuItemId: item.id,
          name: item.name,
          quantity: 1,
          unitPrice: preview.unitPrice,
          menuItemOptionIds: preview.menuItemOptionIds,
          configurationLabel: preview.configurationLabel,
        },
      ];
    });
    return true;
  };

  const requestAddToCart = (item: MenuItem) => {
    if (stockBlocking && !isSellable(item.id)) {
      toast.error(`${item.name} is out of stock at this branch`);
      return;
    }
    const groups = item.optionGroups;
    if (groups?.length) {
      const initialIds = applyDefaultSelections(groups, []);
      setPickerSelections(selectionsRecordFromIds(groups, initialIds));
      setOptionPickerItem(item);
      setOptionPickerOpen(true);
      return;
    }
    void commitCartLine(item, []);
  };

  const togglePickerOption = (g: ClientMenuOptionGroup, optionId: string) => {
    setPickerSelections((prev) => {
      const cur = prev[g.id] || [];
      if (g.maxSelections <= 1) {
        return { ...prev, [g.id]: cur[0] === optionId ? [] : [optionId] };
      }
      const set = new Set(cur);
      if (set.has(optionId)) set.delete(optionId);
      else if (set.size < g.maxSelections) set.add(optionId);
      return { ...prev, [g.id]: [...set] };
    });
  };

  const confirmOptionPicker = () => {
    if (!optionPickerItem?.optionGroups?.length) {
      setOptionPickerOpen(false);
      setOptionPickerItem(null);
      return;
    }
    const groups = optionPickerItem.optionGroups;
    const flat = flattenPickerSelections(groups, pickerSelections);
    void commitCartLine(optionPickerItem, flat).then((ok) => {
      if (ok) {
        setOptionPickerOpen(false);
        setOptionPickerItem(null);
      }
    });
  };

  const updateQuantity = (lineKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.lineKey === lineKey ? { ...c, quantity: c.quantity + delta } : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const removeFromCart = (lineKey: string) => {
    setCart((prev) => prev.filter((c) => c.lineKey !== lineKey));
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

    setSubmitPhase("creating");
    setIsSubmitting(true);
    try {
      const result = await createOrder({
        branchId,
        source: source as "CALL_CENTER" | "ONLINE" | "WHATSAPP" | "WALK_IN" | "POS",
        type: type as "DINE_IN" | "TAKEOUT" | "DELIVERY",
        customerId:
          customerId && customerId !== "walk-in" ? customerId : undefined,
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          notes: c.notes,
          menuItemOptionIds: c.menuItemOptionIds,
        })),
        notes: notes || undefined,
        discount,
        deliveryFee: isDelivery ? deliveryFee : 0,
        deliveryAddress: isDelivery ? deliveryAddress : undefined,
        deliveryNeighborhood: isDelivery ? deliveryNeighborhood : undefined,
        deliveryPhone: isDelivery ? deliveryPhone : undefined,
        deliveryNotes: isDelivery ? deliveryNotes : undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Order created successfully");
        void refreshStockAvailability();
        const orderId = result.data?.id;
        if (orderId && onOrderCreated) {
          setSubmitPhase("opening");
          await onOrderCreated(orderId);
        }
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
    setDeliveryNeighborhood("");
    setDeliveryPhone("");
    setDeliveryNotes("");
    setShowNewCustomer(false);
    setNewName("");
    setNewPhone("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isSubmitting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto relative">
        {isSubmitting && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/85 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">
              {submitPhase === "opening" ? "Opening order…" : "Creating order…"}
            </p>
          </div>
        )}
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Add a new order with items, customer, and delivery details
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Order Info Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Branch *</Label>
              <Select value={branchId} onValueChange={handleBranchChange}>
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
              <Label>Customer</Label>
              <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerOpen}
                    className="justify-between font-normal"
                  >
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
                            onSelect={() => setShowNewCustomer(true)}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add New Customer
                          </CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup>
                          <CommandItem
                            value="walk-in"
                            onSelect={() => {
                              setCustomerId("walk-in");
                              setCustomerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                customerId === "walk-in"
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            Walk-in Customer
                          </CommandItem>
                          {localCustomers.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.name} ${c.phone}`}
                              onSelect={() => {
                                setCustomerId(c.id);
                                setCustomerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  customerId === c.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{c.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {c.phone}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  ) : (
                    <div className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">
                          New Customer
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setShowNewCustomer(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                      <Input
                        placeholder="Customer name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        autoFocus
                      />
                      <Input
                        placeholder="Phone number"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={handleCreateCustomer}
                        disabled={
                          isCreatingCustomer ||
                          !newName.trim() ||
                          !newPhone.trim()
                        }
                      >
                        {isCreatingCustomer ? (
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        ) : (
                          <UserPlus className="mr-2 h-3 w-3" />
                        )}
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

          {/* Menu Items Search + Cart */}
          <div className="grid gap-2">
            <Label>Items *</Label>
            <Input
              placeholder={
                branchId
                  ? "Search menu items..."
                  : "Select a branch first"
              }
              value={searchItem}
              onChange={(e) => setSearchItem(e.target.value)}
              disabled={!branchId}
            />
            {!branchId && (
              <p className="text-sm text-muted-foreground">
                Select a branch to add menu items
              </p>
            )}
            {branchId && searchItem && (
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {filteredMenuItems.slice(0, 10).map((item) => {
                  const outOfStock = stockBlocking && !isSellable(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={outOfStock}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors",
                        outOfStock && "opacity-50 cursor-not-allowed hover:bg-transparent"
                      )}
                      onClick={() => {
                        requestAddToCart(item);
                        setSearchItem("");
                      }}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="truncate">
                          {item.name}{" "}
                          <span className="text-muted-foreground">
                            ({item.sku})
                          </span>
                        </span>
                        {outOfStock && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            Out of stock
                          </Badge>
                        )}
                      </span>
                      <span className="font-medium shrink-0">
                        {formatCurrency(item.price)}
                      </span>
                    </button>
                  );
                })}
                {filteredMenuItems.length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    No items found for this branch
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="border rounded-md divide-y">
              {cart.map((item) => (
                <div
                  key={item.lineKey}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{item.name}</span>
                    {item.configurationLabel ? (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.configurationLabel}
                      </p>
                    ) : null}
                    <span className="ml-0 text-xs text-muted-foreground">
                      {formatCurrency(item.unitPrice)} each
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.lineKey, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-medium w-6 text-center">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.lineKey, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-medium w-20 text-right">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500"
                      onClick={() => removeFromCart(item.lineKey)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="px-3 py-2 text-sm font-medium text-right">
                Total: {formatCurrency(total)}
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
                  <Input
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Address"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Neighborhood</Label>
                  <Input
                    value={deliveryNeighborhood}
                    onChange={(e) => setDeliveryNeighborhood(e.target.value)}
                    placeholder="Neighborhood"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Delivery Phone</Label>
                  <Input
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    placeholder="Phone"
                  />
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
                      if (v === "" || /^\d*\.?\d{0,2}$/.test(v))
                        setDeliveryFeeStr(v);
                    }}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Delivery Notes</Label>
                  <Input
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Instructions"
                  />
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
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={1}
                placeholder="Order notes"
              />
            </div>
          </div>

          {/* Order Summary */}
          {cart.length > 0 && (
            <div className="border rounded-md p-3 space-y-1 bg-muted/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {showTaxBreakdown && !selectedBranch?.taxInclusive ? "Subtotal" : "Items total"}
                </span>
                <span>{formatCurrency(lineTotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-red-500">
                    -{formatCurrency(discount)}
                  </span>
                </div>
              )}
              {showTaxBreakdown && tax > 0 && selectedBranch?.taxEnabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {selectedBranch?.taxInclusive
                      ? `${selectedBranch.taxName} included (${selectedBranch.taxRate}%)`
                      : `${selectedBranch?.taxName || "Tax"} (${selectedBranch?.taxRate ?? 0}%)`}
                  </span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              {!showTaxBreakdown &&
                selectedBranch?.taxInclusive &&
                selectedBranch?.taxEnabled &&
                tax > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Prices include {selectedBranch.taxName}; tax is not shown on the customer receipt.
                  </p>
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

        <Dialog
          open={optionPickerOpen}
          onOpenChange={(o) => {
            setOptionPickerOpen(o);
            if (!o) setOptionPickerItem(null);
          }}
        >
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{optionPickerItem?.name ?? "Options"}</DialogTitle>
              <DialogDescription>
                Choose options for this line. Prices update from your catalog.
              </DialogDescription>
            </DialogHeader>
            {optionPickerItem?.optionGroups?.map((g) => {
              const picked = pickerSelections[g.id] || [];
              const rangeHint = formatOptionGroupRangeHint(g);
              return (
                <div key={g.id} className="space-y-2 mb-4">
                  <p className="text-sm font-medium">
                    {g.name}
                    <span className="text-muted-foreground font-normal"> ({rangeHint})</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {g.options.map((o) => {
                      const active = picked.includes(o.id);
                      const deltaLabel =
                        o.priceDelta !== 0
                          ? ` (${o.priceDelta > 0 ? "+" : ""}${formatCurrency(o.priceDelta)})`
                          : "";
                      return (
                        <Button
                          key={o.id}
                          type="button"
                          variant={active ? "default" : "outline"}
                          size="sm"
                          className="h-auto min-h-9 whitespace-normal text-left"
                          onClick={() => togglePickerOption(g, o.id)}
                        >
                          {o.name}
                          {deltaLabel}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <DialogFooter className="flex-col sm:flex-col gap-3">
              {optionPickerItem?.optionGroups?.length ? (
                <div className="flex justify-between text-sm w-full border-t pt-3">
                  <span className="text-muted-foreground">Line price</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      buildLinePreview(
                        optionPickerItem.price,
                        optionPickerItem.optionGroups,
                        applyDefaultSelections(
                          optionPickerItem.optionGroups,
                          flattenPickerSelections(
                            optionPickerItem.optionGroups,
                            pickerSelections
                          )
                        )
                      ).unitPrice
                    )}
                  </span>
                </div>
              ) : null}
              <div className="flex gap-2 justify-end w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOptionPickerOpen(false);
                    setOptionPickerItem(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={confirmOptionPicker}>
                  Add to order
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting
              ? submitPhase === "opening"
                ? "Opening order…"
                : "Creating order…"
              : "Create Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
