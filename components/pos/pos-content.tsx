"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Clock,
  ChevronUp,
  ChevronDown,
  ChefHat,
  Send,
  WifiOff,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import {
  createPosOrder,
  sendToKitchen,
  getKitchenStations,
  completeOrder,
  completeComplimentaryOrder,
} from "@/lib/actions/pos";
import { savePosSnapshot, loadPosSnapshot, enqueuePosOutbox } from "@/lib/offline/pos-idb";
import { drainPosOutbox } from "@/lib/offline/pos-sync";
import { getBranchTaxRate } from "@/lib/actions/tax";
import { computeOrderTaxAmounts } from "@/lib/services/tax-calculation";
import { OrderType, Role } from "@/lib/generated/prisma/client";
import { TableServicePanel } from "@/components/pos/table-service-panel";
import { useEffect, useCallback, useRef } from "react";
import { isMenuItemVisibleAtBranch } from "@/lib/menu/branch-availability";
import { useMenuStockAvailability } from "@/hooks/use-menu-stock-availability";
import { validateMenuItemStockForSale } from "@/lib/actions/menu-stock-availability";
import { useCurrency } from "@/contexts/currency-context";
import { useBranchCurrency } from "@/hooks/use-branch-currency";
import { useBranchRestrictions, filterBranchesForUser } from "@/hooks/use-branch-restrictions";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { PaymentModal, type PaymentData } from "@/components/pos/payment-modal";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type ClientMenuOptionGroup,
  applyDefaultSelections,
  buildLinePreview,
  formatOptionGroupRangeHint,
  posCartLineKey,
  validateOptionSelections,
} from "@/lib/menu-option-client";
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
  optionGroups?: ClientMenuOptionGroup[];
  availableAtAllBranches?: boolean;
  branchIds?: string[];
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  openedAt: Date | string;
  branch: { name: string };
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

type StorefrontQrProp = { url: string } | null;

interface PosContentProps {
  branches: Branch[];
  menuItems: MenuItem[];
  recentOrders: RecentOrder[];
  customers: Customer[];
  storefrontQr?: StorefrontQrProp;
  allowComplimentary?: boolean;
  tableManagementEnabled?: boolean;
  userRole?: Role;
}

interface CartLine {
  lineKey: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  menuItemOptionIds: string[];
  configurationLabel: string;
}

const orderTypes = [
  { value: "DINE_IN", label: "Dine-in", icon: UtensilsCrossed, color: "bg-emerald-500" },
  { value: "TAKEOUT", label: "Takeout", icon: Package, color: "bg-amber-500" },
  { value: "DELIVERY", label: "Delivery", icon: Truck, color: "bg-blue-500" },
];

export function PosContent({
  branches,
  menuItems,
  recentOrders,
  customers,
  storefrontQr = null,
  allowComplimentary = false,
  tableManagementEnabled = false,
  userRole: userRoleProp = "STAFF",
}: PosContentProps) {
  const { formatCurrency } = useCurrency();
  const { canViewAllBranches, userBranchId, userRole: sessionRole, isLoading: authLoading } =
    useBranchRestrictions();
  const userRole = userRoleProp || (sessionRole as Role);
  const [tableSessionId, setTableSessionId] = useState<string | null>(null);
  const [tableLabel, setTableLabel] = useState<string | null>(null);
  const [waiterOrderNote, setWaiterOrderNote] = useState("");

  /** Start true on server + first client paint to avoid hydration mismatch; sync from navigator in useEffect. */
  const [isOnline, setIsOnline] = useState(true);
  const [liveBranches, setLiveBranches] = useState(branches);
  const [liveMenuItems, setLiveMenuItems] = useState(menuItems);
  const [liveRecentOrders, setLiveRecentOrders] = useState(recentOrders);
  const [liveCustomers, setLiveCustomers] = useState(customers);
  
  // Filter branches based on user permissions
  const availableBranches = filterBranchesForUser(liveBranches, canViewAllBranches, userBranchId);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const onOnline = () => {
      setIsOnline(true);
      void drainPosOutbox().then((r) => {
        if (r.synced > 0) {
          toast.success(`Synced ${r.synced} offline order(s)`);
        }
      });
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const snap = await loadPosSnapshot();
        if (!cancelled && snap) {
          setLiveBranches(snap.branches as Branch[]);
          setLiveMenuItems(snap.menuItems as MenuItem[]);
          setLiveRecentOrders(snap.recentOrders as RecentOrder[]);
          setLiveCustomers(snap.customers as Customer[]);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.onLine) return;
    setLiveBranches(branches);
    setLiveMenuItems(menuItems);
    setLiveRecentOrders(recentOrders);
    setLiveCustomers(customers);
    void savePosSnapshot({ branches, menuItems, recentOrders, customers });
    void drainPosOutbox();
  }, [branches, menuItems, recentOrders, customers]);

  useEffect(() => {
    if (!isOnline) return;
    void drainPosOutbox();
  }, [isOnline]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && typeof navigator !== "undefined" && navigator.onLine) {
        void drainPosOutbox();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const [branchId, setBranchId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [isPending, startTransition] = useTransition();
  const [optionPickerOpen, setOptionPickerOpen] = useState(false);
  const [optionPickerItem, setOptionPickerItem] = useState<MenuItem | null>(null);
  const [pickerSelections, setPickerSelections] = useState<Record<string, string[]>>({});
  const [isRecentOrdersOpen, setIsRecentOrdersOpen] = useState(false);

  const showTablePanel =
    tableManagementEnabled && orderType === "DINE_IN" && Boolean(branchId);
  const waiterTableMode = showTablePanel && userRole === "WAITER";

  useEffect(() => {
    if (!showTablePanel) {
      setTableSessionId(null);
      setTableLabel(null);
      setWaiterOrderNote("");
    }
  }, [showTablePanel, branchId]);

  useEffect(() => {
    if (!isOnline && orderType === "DELIVERY") {
      setOrderType("DINE_IN");
    }
  }, [isOnline, orderType]);

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
  useBranchCurrency(branchId, liveBranches);

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

  const branchVisibleMenu = useMemo(() => {
    if (!branchId) return [];
    return liveMenuItems.filter((m) =>
      isMenuItemVisibleAtBranch(
        {
          availableAtAllBranches: m.availableAtAllBranches ?? true,
          branchIds: m.branchIds ?? [],
        },
        branchId
      )
    );
  }, [liveMenuItems, branchId]);

  const branchMenuIds = useMemo(
    () => branchVisibleMenu.map((m) => m.id),
    [branchVisibleMenu]
  );
  const {
    blocking: stockBlocking,
    unsellableIds,
    isSellable,
    loading: stockLoading,
    refresh: refreshStockAvailability,
  } = useMenuStockAvailability(branchId, branchMenuIds, true);

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

  const categories = useMemo(() => {
    const cats = Array.from(new Set(branchVisibleMenu.map((m) => m.category))).sort();
    const categoryCounts = cats.map((cat) => ({
      name: cat,
      count: branchVisibleMenu.filter((m) => m.category === cat).length,
    }));
    return categoryCounts;
  }, [branchVisibleMenu]);

  const filteredMenu = useMemo(() => {
    let filtered = branchVisibleMenu;
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
  }, [branchVisibleMenu, search, selectedCategory]);

  const prevBranchIdRef = useRef<string | null>(null);
  const handleBranchChange = (nextBranchId: string) => {
    if (
      prevBranchIdRef.current &&
      nextBranchId &&
      prevBranchIdRef.current !== nextBranchId
    ) {
      setCart((prev) => {
        const next = prev.filter((line) => {
          const item = liveMenuItems.find((m) => m.id === line.menuItemId);
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

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = Math.round(cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0) * 100) / 100;

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
      const idx = prev.findIndex((p) => p.lineKey === lineKey);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          lineKey,
          menuItemId: item.id,
          name: item.name,
          unitPrice: preview.unitPrice,
          quantity: 1,
          menuItemOptionIds: preview.menuItemOptionIds,
          configurationLabel: preview.configurationLabel,
        },
      ];
    });
    toast.success(`${item.name} added`, { duration: 1500 });
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

  const setQty = (lineKey: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((l) => l.lineKey !== lineKey));
      return;
    }
    setCart((prev) => prev.map((l) => (l.lineKey === lineKey ? { ...l, quantity: qty } : l)));
  };

  const removeFromCart = (lineKey: string) => {
    setCart((prev) => prev.filter((l) => l.lineKey !== lineKey));
  };

  const clearCart = () => {
    setCart([]);
  };

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixes serialized Order and offline queue receipt
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  
  // Kitchen integration state
  const [kitchenStations, setKitchenStations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [sendingToKitchen, setSendingToKitchen] = useState(false);
  const [autoSendToKitchen, setAutoSendToKitchen] = useState(true);
  
  // Tax settings state
  const [taxSettings, setTaxSettings] = useState<{
    rate: number;
    name: string;
    enabled: boolean;
    inclusive: boolean;
    showTaxOnReceipt: boolean;
  }>({ rate: 12.5, name: "VAT", enabled: true, inclusive: false, showTaxOnReceipt: true });

  const taxAmounts = computeOrderTaxAmounts({
    lineTotal: cartSubtotal,
    ratePercent: taxSettings.rate,
    enabled: taxSettings.enabled,
    inclusive: taxSettings.inclusive,
  });
  const { subtotal: cartNetSubtotal, tax, total } = taxAmounts;

  // Load kitchen stations and tax settings when branch changes
  const loadKitchenStations = useCallback(async (branchId: string) => {
    if (!branchId) return;
    const result = await getKitchenStations(branchId);
    if (result.success && result.data) {
      setKitchenStations(result.data);
      if (result.data.length > 0) {
        if (!selectedStation) {
          setSelectedStation(result.data[0].id);
        }
      } else {
        // No stations for this branch: disable kitchen auto-send and clear selection.
        setAutoSendToKitchen(false);
        setSelectedStation("");
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
    if (showTablePanel && !tableSessionId) {
      return toast.error("Select or seat a table first");
    }
    if (waiterTableMode) {
      placeTableOrderOnly();
      return;
    }
    setIsPaymentOpen(true);
  };

  const placeTableOrderOnly = () => {
    if (!branchId || !tableSessionId) return;
    startTransition(async () => {
      try {
        const result = await createPosOrder({
          branchId,
          type: "DINE_IN",
          tableSessionId,
          notes: waiterOrderNote.trim() || undefined,
          items: cart.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            menuItemOptionIds: l.menuItemOptionIds,
          })),
          sendToKitchen: autoSendToKitchen,
          stationId: selectedStation || undefined,
        });
        if (!result.success || !result.data) {
          toast.error(result.error || "Failed to place order");
          return;
        }
        if (autoSendToKitchen) {
          toast.success(`Order #${result.data.orderNumber} sent to kitchen`);
        } else {
          toast.success(`Order #${result.data.orderNumber} placed on table ${tableLabel ?? ""}`);
        }
        setCart([]);
        setWaiterOrderNote("");
        void refreshStockAvailability();
      } catch {
        toast.error("Failed to place order");
      }
    });
  };

  const handlePaymentComplete = async (paymentData: PaymentData) => {
    const online = typeof navigator !== "undefined" && navigator.onLine;
    const branch = liveBranches.find((b) => b.id === branchId);

    const queueOffline = async () => {
      if (paymentData.paymentMethod !== "CASH") {
        toast.error("Offline checkout is cash only");
        return;
      }
      if ((paymentData.orderType as OrderType) === "DELIVERY") {
        toast.error("Delivery orders cannot be completed offline");
        return;
      }
      const clientMutationId = uuidv4();
      const createPayload = {
        branchId,
        type: paymentData.orderType as OrderType,
        tableSessionId:
          paymentData.orderType === "DINE_IN" ? tableSessionId ?? undefined : undefined,
        customerId: paymentData.customerId,
        customerName: paymentData.customerName,
        items: cart.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          menuItemOptionIds: l.menuItemOptionIds,
        })),
        paymentMethod: paymentData.paymentMethod,
        notes: paymentData.notes,
        sendToKitchen: autoSendToKitchen,
        stationId: selectedStation || undefined,
        deliveryFee: paymentData.deliveryFee,
        deliveryAddress: paymentData.deliveryAddress,
        deliveryPhone: paymentData.deliveryPhone,
        deliveryNotes: paymentData.deliveryNotes,
      };
      await enqueuePosOutbox({
        clientMutationId,
        createdAt: Date.now(),
        payload: {
          create: createPayload,
          amountReceived: paymentData.amountPaid,
          tip: 0,
          skipStatusComplete: autoSendToKitchen,
        },
      });
      setCompletedOrder({
        syncPending: true,
        clientMutationId,
        orderNumber: `OFFLINE-${clientMutationId.slice(0, 8).toUpperCase()}`,
        type: paymentData.orderType,
        paymentMethod: paymentData.paymentMethod,
        total,
        subtotal: cartNetSubtotal,
        tax,
        taxInclusive: taxSettings.inclusive,
        showTaxOnReceipt: taxSettings.showTaxOnReceipt,
        taxName: taxSettings.name,
        taxRate: taxSettings.rate,
        branch: branch
          ? {
              name: branch.name,
              code: branch.code,
              taxInclusive: taxSettings.inclusive,
              showTaxOnReceipt: taxSettings.showTaxOnReceipt,
              taxName: taxSettings.name,
              taxRate: taxSettings.rate,
            }
          : {},
        createdAt: new Date().toISOString(),
        customerName: paymentData.customerName,
        items: cart.map((l) => ({
          menuItem: { name: l.name },
          configurationLabel: l.configurationLabel || null,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: l.unitPrice * l.quantity,
        })),
        change: paymentData.change,
      });
      setIsPaymentOpen(false);
      setIsReceiptOpen(true);
      toast.message("Order queued for sync", {
        description: "Will upload when you are back online.",
      });
      setCart([]);
    };

    startTransition(async () => {
      if (!online) {
        await queueOffline();
        return;
      }

      try {
        const result = await createPosOrder({
          branchId,
          type: paymentData.orderType as OrderType,
          tableSessionId:
            paymentData.orderType === "DINE_IN" ? tableSessionId ?? undefined : undefined,
          customerId: paymentData.customerId,
          customerName: paymentData.customerName,
          items: cart.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            menuItemOptionIds: l.menuItemOptionIds,
          })),
          paymentMethod: paymentData.paymentMethod,
          notes: paymentData.notes,
          sendToKitchen: autoSendToKitchen,
          stationId: selectedStation || undefined,
          deliveryFee: paymentData.deliveryFee,
          deliveryAddress: paymentData.deliveryAddress,
          deliveryPhone: paymentData.deliveryPhone,
          deliveryNotes: paymentData.deliveryNotes,
        });
        if (!result.success || !result.data) {
          toast.error(result.error || "Failed to create order");
          setIsPaymentOpen(false);
          return;
        }

        const completeResult =
          paymentData.paymentMethod === "COMPLIMENTARY"
            ? await completeComplimentaryOrder({
                orderId: result.data.id,
                reason: paymentData.complimentaryReason || "Complimentary",
              })
            : await completeOrder({
                orderId: result.data.id,
                paymentMethod: paymentData.paymentMethod,
                amountReceived: paymentData.amountPaid,
                tip: 0,
                createSale: true,
                skipStatusComplete: autoSendToKitchen,
              });

        if (!completeResult.success) {
          toast.error(completeResult.error || "Failed to complete order");
          setIsPaymentOpen(false);
          return;
        }

        setCompletedOrder({
          ...result.data,
          change: completeResult.data?.change || paymentData.change,
        });
        setIsPaymentOpen(false);
        setIsReceiptOpen(true);

        if (autoSendToKitchen) {
          toast.success("Order sent to kitchen", {
            description: `Order #${result.data?.orderNumber} sent to kitchen display`,
          });
        } else {
          toast.success("Order completed successfully", {
            description: `Order #${result.data?.orderNumber}`,
          });
        }
        setCart([]);
        void refreshStockAvailability();
      } catch (e) {
        console.warn("[POS] Network error, queueing offline:", e);
        await queueOffline();
      }
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

  const selectedBranch = liveBranches.find((b) => b.id === branchId);

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col gap-3">
      {!isOnline ? (
        <Alert className="shrink-0 border-amber-500/50 bg-amber-500/5 py-2">
          <WifiOff className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-sm text-amber-950 dark:text-amber-100">
            Offline mode: using the last saved menu and prices. Checkout is cash only; orders sync when you reconnect.
            Kitchen and inventory update after sync.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex min-h-0 flex-1 gap-4">
      {/* Left Panel - Menu */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {showTablePanel && (
          <TableServicePanel
            branchId={branchId}
            activeSessionId={tableSessionId}
            onSessionChange={(id, label) => {
              setTableSessionId(id);
              setTableLabel(label);
            }}
          />
        )}
        {/* Header Controls */}
        <div className="flex flex-wrap items-center gap-3 pb-3 shrink-0">
          {/* Branch Selector */}
          <Select value={branchId} onValueChange={handleBranchChange}>
            <SelectTrigger className="w-[180px] h-10 bg-background">
              <Store className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Select Branch" />
            </SelectTrigger>
            <SelectContent>
              {liveBranches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Order Type Buttons + Kitchen Toggle on same row */}
          <div className="flex items-center gap-2 flex-wrap">
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
                    disabled={!isOnline && type.value === "DELIVERY"}
                    onClick={() => setOrderType(type.value as OrderType)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {type.label}
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {kitchenStations.length > 0 && (
                <Button
                  variant={autoSendToKitchen ? "default" : "outline"}
                  size="sm"
                  className={cn("h-8", autoSendToKitchen && "bg-orange-500 hover:bg-orange-600")}
                  onClick={() => setAutoSendToKitchen(!autoSendToKitchen)}
                  title="Toggle auto-send to kitchen"
                >
                  <ChefHat className="h-4 w-4 mr-1.5" />
                  Kitchen
                </Button>
              )}
              {kitchenStations.length > 0 && (
                <Select value={selectedStation} onValueChange={setSelectedStation}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue placeholder="Station" />
                  </SelectTrigger>
                  <SelectContent>
                    {kitchenStations.map((station) => (
                      <SelectItem key={station.id} value={station.id}>
                        {station.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
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
            All ({branchVisibleMenu.length})
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
              const qtyOnProduct = cart
                .filter((c) => c.menuItemId === m.id)
                .reduce((s, c) => s + c.quantity, 0);
              const outOfStock = stockBlocking && !isSellable(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={outOfStock}
                  className={cn(
                    "relative flex flex-col rounded-xl border bg-card p-3 text-left transition-all hover:shadow-md hover:border-primary/50 active:scale-[0.98]",
                    qtyOnProduct > 0 && "ring-2 ring-primary border-primary",
                    outOfStock && "cursor-not-allowed opacity-50 hover:shadow-none hover:border-border"
                  )}
                  onClick={() => requestAddToCart(m)}
                >
                  {outOfStock && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 -right-2 text-[10px] px-1.5"
                    >
                      Out of stock
                    </Badge>
                  )}
                  {qtyOnProduct > 0 && !outOfStock && (
                    <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-bold">
                      {qtyOnProduct}
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
                  key={l.lineKey}
                  className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs leading-tight truncate">{l.name}</h4>
                    {l.configurationLabel ? (
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                        {l.configurationLabel}
                      </p>
                    ) : null}
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
                      onClick={() => setQty(l.lineKey, l.quantity - 1)}
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
                      onClick={() => setQty(l.lineKey, l.quantity + 1)}
                      disabled={isPending}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeFromCart(l.lineKey)}
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
                {waiterTableMode && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Order note (optional)</label>
                    <Input
                      value={waiterOrderNote}
                      onChange={(e) => setWaiterOrderNote(e.target.value)}
                      placeholder="e.g. No onions, allergic to nuts"
                      maxLength={200}
                    />
                  </div>
                )}
                {taxSettings.inclusive && taxSettings.enabled ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Items total</span>
                      <span>{formatCurrency(cartSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {taxSettings.name} included ({taxSettings.rate}%)
                      </span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(cartSubtotal)}</span>
                    </div>
                    {taxSettings.enabled && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {taxSettings.name} ({taxSettings.rate}%)
                        </span>
                        <span>{formatCurrency(tax)}</span>
                      </div>
                    )}
                  </>
                )}
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
                ) : waiterTableMode ? (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Send to table{tableLabel ? ` ${tableLabel}` : ""}
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
          {liveRecentOrders.length > 0 && (
            <Collapsible open={isRecentOrdersOpen} onOpenChange={setIsRecentOrdersOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between h-10 text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Orders ({liveRecentOrders.length})
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
                  {liveRecentOrders.slice(0, 5).map((o) => (
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
                        {o.status === "NEW" && (
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
        subtotal={taxSettings.inclusive ? cartNetSubtotal : cartSubtotal}
        tax={tax}
        taxName={taxSettings.name}
        taxRate={taxSettings.rate}
        taxInclusive={taxSettings.inclusive}
        taxEnabled={taxSettings.enabled}
        lineTotal={cartSubtotal}
        onComplete={handlePaymentComplete}
        isProcessing={isPending}
        customers={liveCustomers}
        orderType={orderType}
        onOrderTypeChange={(t) => setOrderType(t as OrderType)}
        offlineRestricted={!isOnline}
        allowComplimentary={allowComplimentary}
      />

      <Dialog
        open={optionPickerOpen}
        onOpenChange={(open) => {
          setOptionPickerOpen(open);
          if (!open) setOptionPickerItem(null);
        }}
      >
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{optionPickerItem?.name ?? "Options"}</DialogTitle>
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
          <DialogFooter className="flex-col sm:flex-col gap-3 pt-2">
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
                        flattenPickerSelections(optionPickerItem.optionGroups, pickerSelections)
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

      {/* Receipt Modal */}
      {completedOrder && (
        <ReceiptModal
          open={isReceiptOpen}
          onOpenChange={setIsReceiptOpen}
          order={completedOrder}
          storefrontQr={storefrontQr}
          onClose={() => {
            setCompletedOrder(null);
            setIsReceiptOpen(false);
          }}
        />
      )}
      </div>
    </div>
  );
}
