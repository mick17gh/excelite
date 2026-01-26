"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Loader2,
  X,
  Store,
  UtensilsCrossed,
  Package,
  Truck,
  Smartphone,
  Clock,
  ChevronUp,
  ChevronDown,
  ChefHat,
  Send,
} from "lucide-react";
import { createPosOrder, sendToKitchen, getKitchenStations, completeOrder } from "@/lib/actions/pos";
import { getBranchTaxRate } from "@/lib/actions/tax";
import { OrderType, SalesChannel } from "@/lib/generated/prisma/client";
import { useEffect, useCallback } from "react";
import { useCurrency } from "@/contexts/currency-context";
import { useBranchCurrency } from "@/hooks/use-branch-currency";
import { useBranchRestrictions, filterBranchesForUser } from "@/hooks/use-branch-restrictions";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { PaymentModal, type PaymentData } from "@/components/pos/payment-modal";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Branch {
  id: string;
  name: string;
  code: string;
  currency?: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl?: string | null;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: any;
  openedAt: Date;
  branch: { name: string };
}

interface PosContentProps {
  branches: Branch[];
  menuItems: MenuItem[];
  recentOrders: RecentOrder[];
}

interface CartLine {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

const orderTypes = [
  { value: "DINE_IN", label: "Dine-in", icon: UtensilsCrossed, color: "bg-emerald-500" },
  { value: "TAKEOUT", label: "Takeout", icon: Package, color: "bg-amber-500" },
  { value: "DELIVERY", label: "Delivery", icon: Truck, color: "bg-blue-500" },
  { value: "APP", label: "App Order", icon: Smartphone, color: "bg-purple-500" },
];

export function PosContent({ branches, menuItems, recentOrders }: PosContentProps) {
  const { formatCurrency } = useCurrency();
  const { canViewAllBranches, userBranchId, isLoading: authLoading } = useBranchRestrictions();
  
  // Filter branches based on user permissions
  const availableBranches = filterBranchesForUser(branches, canViewAllBranches, userBranchId);
  
  const [branchId, setBranchId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isRecentOrdersOpen, setIsRecentOrdersOpen] = useState(false);

  // Auto-select user's branch if they're restricted, or first available branch
  useEffect(() => {
    if (!authLoading && availableBranches.length > 0 && !branchId) {
      if (!canViewAllBranches && userBranchId) {
        // Restricted users get their assigned branch
        setBranchId(userBranchId);
      } else {
        // Managers and admins get the first available branch
        setBranchId(availableBranches[0].id);
      }
    }
  }, [authLoading, canViewAllBranches, userBranchId, availableBranches, branchId]);

  // Auto-set currency based on selected branch
  useBranchCurrency(branchId, branches);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "Enter",
      action: () => {
        if (cart.length > 0 && !isPending) {
          submitOrder();
        }
      },
      description: "Complete order",
    },
    {
      key: "Escape",
      action: () => {
        setCart([]);
        setSearch("");
      },
      description: "Clear cart",
    },
    {
      key: "f",
      ctrl: true,
      action: () => {
        document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus();
      },
      description: "Focus search",
    },
  ]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menuItems.map((m) => m.category))).sort();
    const categoryCounts = cats.map((cat) => ({
      name: cat,
      count: menuItems.filter((m) => m.category === cat).length,
    }));
    return categoryCounts;
  }, [menuItems]);

  const filteredMenu = useMemo(() => {
    let filtered = menuItems;
    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
      );
    }
    if (selectedCategory !== "all") {
      filtered = filtered.filter((m) => m.category === selectedCategory);
    }
    return filtered;
  }, [menuItems, search, selectedCategory]);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((p) => p.menuItemId === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { menuItemId: item.id, name: item.name, unitPrice: item.price, quantity: 1 }];
    });
    toast.success(`${item.name} added`, { duration: 1500 });
  };

  const setQty = (menuItemId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((l) => l.menuItemId !== menuItemId));
      return;
    }
    setCart((prev) =>
      prev.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: qty } : l))
    );
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((l) => l.menuItemId !== menuItemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  
  // Kitchen integration state
  const [kitchenStations, setKitchenStations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [sendingToKitchen, setSendingToKitchen] = useState(false);
  const [autoSendToKitchen, setAutoSendToKitchen] = useState(true);
  
  // Tax settings state
  const [taxSettings, setTaxSettings] = useState<{ rate: number; name: string; enabled: boolean }>({ rate: 12.5, name: "VAT", enabled: true });

  // Calculate tax and total after taxSettings is declared
  const taxRate = taxSettings.enabled ? taxSettings.rate / 100 : 0;
  const tax = cartSubtotal * taxRate;
  const total = cartSubtotal + tax;

  // Load kitchen stations and tax settings when branch changes
  const loadKitchenStations = useCallback(async (branchId: string) => {
    if (!branchId) return;
    const result = await getKitchenStations(branchId);
    if (result.success && result.data) {
      setKitchenStations(result.data);
      if (result.data.length > 0 && !selectedStation) {
        setSelectedStation(result.data[0].id);
      }
    }
  }, [selectedStation]);

  const loadTaxSettings = useCallback(async (branchId: string) => {
    if (!branchId) return;
    const settings = await getBranchTaxRate(branchId);
    setTaxSettings(settings);
  }, []);
  
  useEffect(() => {
    if (branchId) {
      loadKitchenStations(branchId);
      loadTaxSettings(branchId);
    }
  }, [branchId, loadKitchenStations, loadTaxSettings]);

  const submitOrder = () => {
    if (!branchId) return toast.error("Select a branch");
    if (cart.length === 0) return toast.error("Cart is empty");
    setIsPaymentOpen(true);
  };

  const handlePaymentComplete = async (paymentData: PaymentData) => {
    startTransition(async () => {
      // First create the POS order
      const result = await createPosOrder({
        branchId,
        type: orderType,
        sourceChannel: orderType as unknown as SalesChannel,
        items: cart.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        paymentMethod: paymentData.paymentMethod,
        customerName: paymentData.customerName,
        notes: paymentData.notes,
        sendToKitchen: autoSendToKitchen && kitchenStations.length > 0,
        stationId: selectedStation || undefined,
      });
      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to create order");
        setIsPaymentOpen(false);
        return;
      }

      // Complete the order to create Transaction + Sale records for reporting
      const completeResult = await completeOrder({
        orderId: result.data.id,
        paymentMethod: paymentData.paymentMethod,
        amountReceived: paymentData.amountPaid,
        tip: 0,
        createSale: true, // This creates Transaction + Sale records
      });

      if (!completeResult.success) {
        console.error("Failed to complete order:", completeResult.error);
        // Order was created but completion failed - still show success but log error
      }

      setCompletedOrder({
        ...result.data,
        change: completeResult.data?.change || paymentData.change,
      });
      setIsPaymentOpen(false);
      setIsReceiptOpen(true);
      
      if (autoSendToKitchen && kitchenStations.length > 0) {
        toast.success("Order sent to kitchen", {
          description: `Order #${result.data?.orderNumber} sent to kitchen display`,
        });
      } else {
        toast.success("Order completed successfully", {
          description: `Order #${result.data?.orderNumber}`,
        });
      }
      setCart([]);
    });
  };
  
  const handleSendToKitchen = async (orderId: string) => {
    if (!orderId) return;
    setSendingToKitchen(true);
    try {
      const result = await sendToKitchen(orderId, undefined, selectedStation || undefined);
      if (result.success) {
        toast.success("Sent to kitchen", {
          description: `Ticket created for ${result.data?.itemCount} items`,
        });
      } else {
        toast.error(result.error || "Failed to send to kitchen");
      }
    } finally {
      setSendingToKitchen(false);
    }
  };

  const selectedBranch = branches.find((b) => b.id === branchId);
  const selectedOrderType = orderTypes.find((t) => t.value === orderType);

  return (
    <div className="flex h-[calc(100vh-100px)] gap-4">
      {/* Left Panel - Menu */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Controls */}
        <div className="flex flex-wrap items-center gap-3 pb-3 shrink-0">
          {/* Branch Selector */}
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-[180px] h-10 bg-background">
              <Store className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Select Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Order Type Buttons */}
          <div className="flex rounded-lg border bg-muted/50 p-1 gap-1">
            {orderTypes.map((type) => {
              const Icon = type.icon;
              const isActive = orderType === type.value;
              return (
                <Button
                  key={type.value}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 px-3 transition-all",
                    isActive && type.color
                  )}
                  onClick={() => setOrderType(type.value as OrderType)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {type.label}
                </Button>
              );
            })}
          </div>
          
          {/* Kitchen Station Selector */}
          {kitchenStations.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant={autoSendToKitchen ? "default" : "outline"}
                size="sm"
                className={cn("h-8", autoSendToKitchen && "bg-orange-500 hover:bg-orange-600")}
                onClick={() => setAutoSendToKitchen(!autoSendToKitchen)}
              >
                <ChefHat className="h-4 w-4 mr-1.5" />
                Auto Kitchen
              </Button>
              <Select value={selectedStation} onValueChange={setSelectedStation}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Kitchen Station" />
                </SelectTrigger>
                <SelectContent>
                  {kitchenStations.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3 shrink-0">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-11 text-base bg-background"
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => setSearch("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 pb-3 shrink-0 overflow-x-auto">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            className="shrink-0 h-8"
            onClick={() => setSelectedCategory("all")}
          >
            All ({menuItems.length})
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.name}
              variant={selectedCategory === cat.name ? "default" : "outline"}
              size="sm"
              className="shrink-0 h-8"
              onClick={() => setSelectedCategory(cat.name)}
            >
              {cat.name} ({cat.count})
            </Button>
          ))}
        </div>

        {/* Menu Grid */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 p-1 pb-4">
            {filteredMenu.map((m) => {
              const inCart = cart.find((c) => c.menuItemId === m.id);
              return (
                <button
                  key={m.id}
                  className={cn(
                    "relative flex flex-col rounded-xl border bg-card p-3 text-left transition-all hover:shadow-md hover:border-primary/50 active:scale-[0.98]",
                    inCart && "ring-2 ring-primary border-primary"
                  )}
                  onClick={() => addToCart(m)}
                >
                  {inCart && (
                    <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-bold">
                      {inCart.quantity}
                    </Badge>
                  )}
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted mb-3">
                    {m.imageUrl ? (
                      <Image
                        src={m.imageUrl}
                        alt={m.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <UtensilsCrossed className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm line-clamp-2 leading-tight">{m.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{m.category}</p>
                  </div>
                  <p className="mt-2 text-base font-bold text-primary">
                    {formatCurrency(m.price)}
                  </p>
                </button>
              );
            })}
          </div>
          {filteredMenu.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No items found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-[380px] flex flex-col bg-card rounded-2xl border shadow-sm overflow-hidden">
        {/* Cart Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {cartItemCount}
                </Badge>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-lg">Current Order</h2>
              <p className="text-sm text-muted-foreground">{selectedBranch?.name || "Select branch"}</p>
            </div>
          </div>
          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Cart Items - Scrollable area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="font-medium text-muted-foreground">Cart is empty</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Tap menu items to add
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((l) => (
                <div
                  key={l.menuItemId}
                  className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs leading-tight truncate">{l.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(l.unitPrice)}
                      </span>
                      <span className="text-xs font-semibold text-primary">
                        {formatCurrency(l.unitPrice * l.quantity)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-6 w-6 rounded-full"
                      onClick={() => setQty(l.menuItemId, l.quantity - 1)}
                      disabled={isPending}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center font-semibold text-xs">
                      {l.quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-6 w-6 rounded-full"
                      onClick={() => setQty(l.menuItemId, l.quantity + 1)}
                      disabled={isPending}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeFromCart(l.menuItemId)}
                      disabled={isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </ScrollArea>
        </div>

        {/* Cart Footer - Fixed at bottom */}
        <div className="border-t bg-card p-4 space-y-3 shrink-0">
          {cart.length > 0 && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{taxSettings.name} ({taxSettings.rate}%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              <Button
                onClick={submitOrder}
                disabled={isPending || cart.length === 0}
                className="w-full h-14 text-lg font-semibold rounded-xl"
                size="lg"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Complete Order ({formatCurrency(total)})
                  </>
                )}
              </Button>
            </>
          )}

          {/* Recent Orders Collapsible */}
          {recentOrders.length > 0 && (
            <Collapsible open={isRecentOrdersOpen} onOpenChange={setIsRecentOrdersOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between h-10 text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Orders ({recentOrders.length})
                  </span>
                  {isRecentOrdersOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {recentOrders.slice(0, 5).map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between rounded-lg border p-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs truncate">{o.orderNumber}</p>
                        <p className="text-[10px] text-muted-foreground">{o.branch?.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2">
                        <span className="font-semibold text-xs">{formatCurrency(Number(o.total))}</span>
                        <Badge
                          variant={
                            o.status === "COMPLETED"
                              ? "default"
                              : o.status === "READY"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px] h-5"
                        >
                          {o.status}
                        </Badge>
                        {o.status === "NEW" && kitchenStations.length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendToKitchen(o.id);
                            }}
                            disabled={sendingToKitchen}
                            title="Send to Kitchen"
                          >
                            {sendingToKitchen ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        total={total}
        subtotal={cartSubtotal}
        tax={tax}
        taxName={taxSettings.name}
        taxRate={taxSettings.rate}
        onComplete={handlePaymentComplete}
        isProcessing={isPending}
      />

      {/* Receipt Modal */}
      {completedOrder && (
        <ReceiptModal
          open={isReceiptOpen}
          onOpenChange={setIsReceiptOpen}
          order={completedOrder}
          onClose={() => {
            setCompletedOrder(null);
            setIsReceiptOpen(false);
          }}
        />
      )}
    </div>
  );
}
