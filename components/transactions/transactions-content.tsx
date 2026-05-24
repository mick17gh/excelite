"use client";

import { useState, useEffect } from "react";
import { useIsMounted } from "@/hooks/use-is-mounted";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Receipt,
  ShoppingCart,
  DollarSign,
  Clock,
  X,
  CheckCircle2,
  Search,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCurrency } from "@/contexts/currency-context";
import { useBranchCurrency } from "@/hooks/use-branch-currency";
import {
  useBranchRestrictions,
  filterBranchesForUser,
} from "@/hooks/use-branch-restrictions";
import { createTransaction, getTransactions } from "@/lib/actions/transactions";
import { getBranchTaxRate } from "@/lib/actions/tax";
import { computeOrderTaxAmounts } from "@/lib/services/tax-calculation";
import { SalesChannel } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

interface Branch {
  id: string;
  name: string;
  code: string;
  currency?: string | null;
  taxRate?: number;
  taxName?: string | null;
  taxEnabled?: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  cost?: number;
  category: string;
}

interface CartItem {
  id: string;
  menuItem: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Transaction {
  id: string;
  saleNumber: string;
  items: number;
  total: number;
  channel: string;
  daypart: string;
  paymentMethod: string;
  time: string;
  status: string;
}

interface TransactionsContentProps {
  branches: Branch[];
  menuItems: MenuItem[];
  initialTransactions?: any[];
}

function formatTxns(data: any[]): Transaction[] {
  return data.map((t: any) => ({
    id: t.id,
    saleNumber: t.transactionRef,
    items: t.sale?.items?.length || 0,
    total: Number(t.amount),
    channel: t.sale?.channel || "DINE_IN",
    daypart: t.sale?.daypart || "LUNCH",
    paymentMethod: t.paymentMethod,
    time: format(new Date(t.transactionDate), "hh:mm a"),
    status: t.isVoided ? "voided" : "completed",
  }));
}

export function TransactionsContent({
  branches,
  menuItems,
  initialTransactions,
}: TransactionsContentProps) {
  const mounted = useIsMounted();
  const { formatCurrency, formatCurrencyShort } = useCurrency();
  const {
    canViewAllBranches,
    userBranchId,
    isLoading: authLoading,
  } = useBranchRestrictions();

  // Filter branches based on user permissions (use all branches until mounted to prevent hydration mismatch)
  const availableBranches = mounted
    ? filterBranchesForUser(branches, canViewAllBranches, userBranchId)
    : branches;

  // Initialize with user's branch if restricted, otherwise first available branch
  const [selectedBranch, setSelectedBranch] = useState<string>("");

  // Auto-select user's branch if they're restricted
  useEffect(() => {
    if (!authLoading) {
      if (!canViewAllBranches && userBranchId) {
        setSelectedBranch(userBranchId);
      } else if (availableBranches.length > 0 && !selectedBranch) {
        setSelectedBranch(availableBranches[0].id);
      }
    }
  }, [authLoading, canViewAllBranches, userBranchId, availableBranches]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [channel, setChannel] = useState<string>("DINE_IN");
  const [paymentMethod, setPaymentMethod] = useState<string>("Card");
  const [customerCount, setCustomerCount] = useState<number>(1);
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(
    initialTransactions ? formatTxns(initialTransactions) : [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [initialFetchDone, setInitialFetchDone] =
    useState(!!initialTransactions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [taxSettings, setTaxSettings] = useState<{
    rate: number;
    name: string;
    enabled: boolean;
    inclusive: boolean;
  }>({ rate: 0, name: "Tax", enabled: false, inclusive: false });

  // Auto-set currency based on selected branch
  useBranchCurrency(selectedBranch, branches);

  // Load tax settings when branch changes
  useEffect(() => {
    const loadTaxSettings = async () => {
      if (!selectedBranch) return;
      const settings = await getBranchTaxRate(selectedBranch);
      setTaxSettings(settings);
    };
    loadTaxSettings();
  }, [selectedBranch]);

  // Fetch today's transactions when branch changes
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!selectedBranch) return;
      // Skip if we already have server-prefetched data for the first branch
      if (initialFetchDone && selectedBranch === (branches[0]?.id || "")) {
        setInitialFetchDone(false);
        return;
      }
      setIsLoading(true);
      try {
        const result = await getTransactions(selectedBranch, new Date());
        if (result.success && result.data) {
          setTransactions(formatTxns(result.data));
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [selectedBranch]);

  // Use actual menu items from props
  const displayMenuItems = menuItems.length > 0 ? menuItems : [];

  const addToCart = (item: MenuItem) => {
    const existingItem = cart.find((c) => c.menuItemId === item.id);
    if (existingItem) {
      setCart(
        cart.map((c) =>
          c.menuItemId === item.id
            ? {
                ...c,
                quantity: c.quantity + 1,
                total: (c.quantity + 1) * c.unitPrice,
              }
            : c,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          id: Date.now().toString(),
          menuItem: item.name,
          menuItemId: item.id,
          quantity: 1,
          unitPrice: item.price,
          total: item.price,
        },
      ]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((c) => c.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(
      cart.map((c) =>
        c.id === id ? { ...c, quantity, total: quantity * c.unitPrice } : c,
      ),
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const { tax, total: grandTotal } = computeOrderTaxAmounts({
    lineTotal: cartTotal,
    ratePercent: taxSettings.rate,
    enabled: taxSettings.enabled,
    inclusive: taxSettings.inclusive,
  });

  const handleSubmitSale = async () => {
    if (cart.length === 0) {
      toast.error("Please add items to the cart");
      return;
    }

    if (!selectedBranch) {
      toast.error("Please select a branch");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const result = await createTransaction({
        branchId: selectedBranch,
        channel: channel as SalesChannel,
        paymentMethod,
        tip: 0,
        customerCount,
        items: cart.map((item) => {
          const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
          return {
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost: menuItem?.cost || item.unitPrice * 0.3,
          };
        }),
      });

      if (result.success) {
        toast.success("Transaction recorded successfully!");
        setCart([]);
        setIsNewSaleOpen(false);
        // Refresh today's transactions
        const refreshResult = await getTransactions(selectedBranch, new Date());
        if (refreshResult.success && refreshResult.data) {
          setTransactions(formatTxns(refreshResult.data));
        }
      } else {
        toast.error(result.error || "Failed to record transaction");
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error("Failed to record transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayTotal = transactions.reduce((sum, t) => sum + t.total, 0);
  const todayCount = transactions.length;
  const avgTicket = todayCount > 0 ? todayTotal / todayCount : 0;

  const getDaypart = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "BREAKFAST";
    if (hour < 15) return "LUNCH";
    if (hour < 21) return "DINNER";
    return "LATE_NIGHT";
  };

  const filteredMenuItems = displayMenuItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Group menu items by category
  const categories = [...new Set(displayMenuItems.map((i) => i.category))];

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          value={selectedBranch}
          onValueChange={setSelectedBranch}
          disabled={mounted ? !canViewAllBranches : false}
        >
          <SelectTrigger className="w-full sm:w-[180px] h-9">
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            {availableBranches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={isNewSaleOpen} onOpenChange={setIsNewSaleOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 hidden">
              <Plus className="mr-2 h-4 w-4" />
              New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0 flex flex-col">
            <DialogHeader className="p-4 pb-3 border-b shrink-0">
              <DialogTitle>New Sale Transaction</DialogTitle>
              <DialogDescription>
                Add items to create a new sale transaction
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
              {/* Menu Items */}
              <div className="border-r flex flex-col min-h-0">
                <div className="p-3 border-b shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search menu items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1 h-0">
                  <div className="p-3 space-y-3">
                    {categories.map((category) => {
                      const items = filteredMenuItems.filter(
                        (i) => i.category === category,
                      );
                      if (items.length === 0) return null;
                      return (
                        <div key={category}>
                          <h4 className="text-xs font-medium text-muted-foreground mb-2">
                            {category}
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {items.map((item) => (
                              <Button
                                key={item.id}
                                variant="outline"
                                className="h-auto py-2 px-2 flex flex-col items-start justify-start text-left"
                                onClick={() => addToCart(item)}
                              >
                                <span className="font-medium text-xs truncate w-full">
                                  {item.name}
                                </span>
                                <span className="text-xs font-semibold text-primary mt-0.5">
                                  {formatCurrency(item.price)}
                                </span>
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Cart */}
              <div className="flex flex-col min-h-0">
                <div className="p-3 border-b shrink-0">
                  <h3 className="font-semibold text-sm">
                    Current Order ({cart.length} items)
                  </h3>
                </div>
                <ScrollArea className="flex-1 h-0">
                  <div className="p-3">
                    {cart.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No items in cart</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {cart.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs truncate">
                                {item.menuItem}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatCurrency(item.unitPrice)} each
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                              >
                                -
                              </Button>
                              <span className="w-6 text-center text-xs">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                              >
                                +
                              </Button>
                              <span className="w-14 text-right font-medium text-xs">
                                {formatCurrency(item.total)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => removeFromCart(item.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Cart Footer */}
                <div className="p-3 border-t space-y-3 shrink-0">
                  {cart.length > 0 && (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(cartTotal)}</span>
                      </div>
                      {taxSettings.enabled && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            {taxSettings.inclusive
                              ? `${taxSettings.name} included (${taxSettings.rate}%)`
                              : `${taxSettings.name} (${taxSettings.rate}%)`}
                          </span>
                          <span>{formatCurrency(tax)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>{formatCurrency(grandTotal)}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px]">Channel</Label>
                      <Select value={channel} onValueChange={setChannel}>
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DINE_IN">Dine-in</SelectItem>
                          <SelectItem value="TAKEOUT">Takeout</SelectItem>
                          <SelectItem value="DELIVERY">Delivery</SelectItem>
                          <SelectItem value="APP">App</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Payment</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={setPaymentMethod}
                      >
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Card">Card</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Mobile">Mobile</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Customers</Label>
                      <Input
                        type="number"
                        min="1"
                        value={customerCount}
                        onChange={(e) =>
                          setCustomerCount(parseInt(e.target.value) || 1)
                        }
                        className="h-8 mt-1"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmitSale}
                    disabled={cart.length === 0 || isSubmitting}
                    className="w-full h-10"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    {isSubmitting
                      ? "Processing..."
                      : `Complete Sale (${formatCurrency(grandTotal)})`}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards - Compact */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">
                  Today's Revenue
                </p>
                <p
                  className="text-base font-bold mt-0.5 truncate"
                  title={formatCurrency(todayTotal)}
                >
                  {todayTotal >= 10000
                    ? formatCurrencyShort(todayTotal)
                    : formatCurrency(todayTotal)}
                </p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">
                  Transactions
                </p>
                <p className="text-base font-bold mt-0.5">{todayCount}</p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">
                  Avg Ticket
                </p>
                <p className="text-base font-bold mt-0.5 truncate">
                  {formatCurrency(avgTicket)}
                </p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">
                  Daypart
                </p>
                <p className="text-base font-bold mt-0.5">{getDaypart()}</p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <Clock className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Today&apos;s Transactions</CardTitle>
          <CardDescription className="text-xs">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Sale #</TableHead>
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs">Items</TableHead>
                  <TableHead className="text-xs">Channel</TableHead>
                  <TableHead className="text-xs">Payment</TableHead>
                  <TableHead className="text-right text-xs">Total</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground text-sm"
                    >
                      No transactions yet today
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-xs font-medium py-2">
                        {txn.saleNumber}
                      </TableCell>
                      <TableCell className="text-xs py-2">{txn.time}</TableCell>
                      <TableCell className="text-xs py-2">
                        {txn.items}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {txn.channel.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        {txn.paymentMethod}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium py-2">
                        {formatCurrency(txn.total)}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge
                          className={cn(
                            "text-[10px] h-5",
                            txn.status === "completed"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                          )}
                        >
                          {txn.status === "completed" ? (
                            <>
                              <CheckCircle2 className="mr-0.5 h-3 w-3" />
                              Done
                            </>
                          ) : (
                            "Voided"
                          )}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
