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
} from "lucide-react";
import { createPosOrder } from "@/lib/actions/pos";
import { OrderType, SalesChannel } from "@/lib/generated/prisma/client";
import { useCurrency } from "@/contexts/currency-context";
import { useBranchCurrency } from "@/hooks/use-branch-currency";
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
  const [branchId, setBranchId] = useState<string>(branches[0]?.id || "");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isRecentOrdersOpen, setIsRecentOrdersOpen] = useState(false);

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
  const tax = cartSubtotal * 0.125;
  const total = cartSubtotal + tax;

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

  const submitOrder = () => {
    if (!branchId) return toast.error("Select a branch");
    if (cart.length === 0) return toast.error("Cart is empty");
    setIsPaymentOpen(true);
  };

  const handlePaymentComplete = async (paymentData: PaymentData) => {
    startTransition(async () => {
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
      });
      if (!result.success) {
        toast.error(result.error || "Failed to create order");
        setIsPaymentOpen(false);
        return;
      }
      setCompletedOrder(result.data);
      setIsPaymentOpen(false);
      setIsReceiptOpen(true);
      toast.success("Order completed successfully", {
        description: `Order #${result.data?.orderNumber}`,
      });
      setCart([]);
    });
  };

  const selectedBranch = branches.find((b) => b.id === branchId);
  const selectedOrderType = orderTypes.find((t) => t.value === orderType);

  return (
    <div className="flex h-[calc(100vh-160px)] gap-6">
      {/* Left Panel - Menu */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Controls */}
        <div className="flex flex-wrap items-center gap-3 pb-4">
          {/* Branch Selector */}
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-[180px] h-11 bg-background">
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
                    "h-9 px-4 transition-all",
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
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-12 text-base bg-background"
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
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            className="shrink-0 h-9"
            onClick={() => setSelectedCategory("all")}
          >
            All ({menuItems.length})
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.name}
              variant={selectedCategory === cat.name ? "default" : "outline"}
              size="sm"
              className="shrink-0 h-9"
              onClick={() => setSelectedCategory(cat.name)}
            >
              {cat.name} ({cat.count})
            </Button>
          ))}
        </div>

        {/* Menu Grid */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 pb-4">
            {filteredMenu.map((m) => {
              const inCart = cart.find((c) => c.menuItemId === m.id);
              return (
                <button
                  key={m.id}
                  className={cn(
                    "relative my-2 mx-1 flex flex-col rounded-xl border bg-card p-3 text-left transition-all hover:shadow-md hover:border-primary/50 active:scale-[0.98]",
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
      <div className="w-[380px] flex flex-col bg-card rounded-2xl border shadow-sm">
        {/* Cart Header */}
        <div className="flex items-center justify-between p-4 border-b">
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

        {/* Cart Items */}
        <ScrollArea className="flex-1 p-4">
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
            <div className="space-y-3">
              {cart.map((l) => (
                <div
                  key={l.menuItemId}
                  className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{l.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatCurrency(l.unitPrice)} each
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {formatCurrency(l.unitPrice * l.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setQty(l.menuItemId, l.quantity - 1)}
                      disabled={isPending}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-semibold text-sm">
                      {l.quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setQty(l.menuItemId, l.quantity + 1)}
                      disabled={isPending}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 ml-1"
                      onClick={() => removeFromCart(l.menuItemId)}
                      disabled={isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Cart Footer - Fixed at bottom */}
        <div className="border-t bg-card p-4 space-y-4 mt-auto">
          {cart.length > 0 && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT (12.5%)</span>
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
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{o.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{o.branch?.name}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="font-semibold">{formatCurrency(Number(o.total))}</span>
                        <Badge
                          variant={
                            o.status === "COMPLETED"
                              ? "default"
                              : o.status === "READY"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {o.status}
                        </Badge>
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
