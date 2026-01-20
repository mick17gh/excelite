"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Receipt,
  ShoppingCart,
  DollarSign,
  Clock,
  Trash2,
  Edit,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCurrency } from "@/contexts/currency-context";
import { useBranchCurrency } from "@/hooks/use-branch-currency";
import { getTransactions } from "@/lib/actions/transactions";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Branch {
  id: string;
  name: string;
  code: string;
  currency?: string | null;
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
}

const menuItemsWithPrices = [
  { id: "1", name: "Grilled Salmon", price: 25.0, category: "Main Course" },
  { id: "2", name: "Classic Burger", price: 15.0, category: "Main Course" },
  { id: "3", name: "Caesar Salad", price: 14.0, category: "Salads" },
  { id: "4", name: "Margherita Pizza", price: 18.0, category: "Pizza" },
  { id: "5", name: "Pasta Carbonara", price: 18.0, category: "Pasta" },
  { id: "6", name: "Fish & Chips", price: 16.0, category: "Main Course" },
  { id: "7", name: "Chicken Wings", price: 12.0, category: "Appetizers" },
  { id: "8", name: "French Fries", price: 6.0, category: "Sides" },
  { id: "9", name: "Soft Drink", price: 3.0, category: "Beverages" },
  { id: "10", name: "Coffee", price: 4.5, category: "Beverages" },
];

const sampleTransactions: Transaction[] = [
  { id: "1", saleNumber: "TXN-001", items: 3, total: 58.0, channel: "DINE_IN", daypart: "LUNCH", paymentMethod: "Card", time: "12:35 PM", status: "completed" },
  { id: "2", saleNumber: "TXN-002", items: 2, total: 33.0, channel: "TAKEOUT", daypart: "LUNCH", paymentMethod: "Cash", time: "12:42 PM", status: "completed" },
  { id: "3", saleNumber: "TXN-003", items: 5, total: 89.5, channel: "DELIVERY", daypart: "LUNCH", paymentMethod: "Card", time: "12:58 PM", status: "completed" },
  { id: "4", saleNumber: "TXN-004", items: 1, total: 25.0, channel: "DINE_IN", daypart: "LUNCH", paymentMethod: "Card", time: "13:15 PM", status: "completed" },
];

export function TransactionsContent({ branches, menuItems }: TransactionsContentProps) {
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  const [selectedBranch, setSelectedBranch] = useState<string>(branches[0]?.id || "");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [channel, setChannel] = useState<string>("DINE_IN");
  const [paymentMethod, setPaymentMethod] = useState<string>("Card");
  const [customerCount, setCustomerCount] = useState<number>(1);
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(sampleTransactions);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-set currency based on selected branch
  useBranchCurrency(selectedBranch, branches);

  // Fetch transactions when branch changes
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!selectedBranch) return;
      setIsLoading(true);
      try {
        const result = await getTransactions(selectedBranch);
        if (result.success && result.data) {
          // Transform database transactions to display format
          const formatted = result.data.map((t: any) => ({
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
          setTransactions(formatted);
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [selectedBranch]);

  const addToCart = (item: typeof menuItemsWithPrices[0]) => {
    const existingItem = cart.find((c) => c.menuItem === item.name);
    if (existingItem) {
      setCart(
        cart.map((c) =>
          c.menuItem === item.name
            ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unitPrice }
            : c
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: Date.now().toString(),
          menuItem: item.name,
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
        c.id === id ? { ...c, quantity, total: quantity * c.unitPrice } : c
      )
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = cartTotal * 0.125; // 12.5% VAT for Ghana
  const grandTotal = cartTotal + tax;

  const getDaypart = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "BREAKFAST";
    if (hour < 15) return "LUNCH";
    if (hour < 21) return "DINNER";
    return "LATE_NIGHT";
  };

  const handleSubmitSale = async () => {
    if (cart.length === 0) {
      toast.error("Please add items to the cart");
      return;
    }

    if (!selectedBranch) {
      toast.error("Please select a branch");
      return;
    }

    try {
      // Create transaction via server action
      const { createTransaction } = await import("@/lib/actions/transactions");
      const result = await createTransaction({
        branchId: selectedBranch,
        channel: channel as any,
        paymentMethod,
        tip: 0,
        customerCount,
        items: cart.map((item) => {
          const menuItem = menuItems.find((mi) => mi.name === item.menuItem);
          if (!menuItem) {
            throw new Error(`Menu item not found: ${item.menuItem}`);
          }
          // Get cost from menu item, or estimate 30% of price
          return {
            menuItemId: menuItem.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost: menuItem.cost || item.unitPrice * 0.3,
          };
        }),
      });

      if (result.success) {
        toast.success("Transaction recorded successfully!");
        setCart([]);
        setIsNewSaleOpen(false);
        // Refresh transactions
        const refreshResult = await getTransactions(selectedBranch);
        if (refreshResult.success && refreshResult.data) {
          const formatted = refreshResult.data.map((t: any) => ({
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
          setTransactions(formatted);
        }
      } else {
        toast.error(result.error || "Failed to record transaction");
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error("Failed to record transaction");
    }
  };

  const todayTotal = transactions.reduce((sum, t) => sum + t.total, 0);
  const todayCount = transactions.length;

  return (
    <div className="space-y-6">
      {/* Branch Selection and Summary */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-full sm:w-[200px]">
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

        <Dialog open={isNewSaleOpen} onOpenChange={setIsNewSaleOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Sale Transaction</DialogTitle>
              <DialogDescription>
                Add items to create a new sale transaction
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              {/* Menu Items */}
              <div>
                <h3 className="font-semibold mb-3">Menu Items</h3>
                <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2">
                  {menuItemsWithPrices.map((item) => (
                    <Button
                      key={item.id}
                      variant="outline"
                      className="h-auto py-3 px-3 flex flex-col items-start justify-start text-left"
                      onClick={() => addToCart(item)}
                    >
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.category}</span>
                      <span className="text-sm font-semibold text-primary mt-1">
                        {formatCurrency(item.price)}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Cart */}
              <div>
                <h3 className="font-semibold mb-3">Current Order</h3>
                <div className="border rounded-lg p-4 space-y-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>No items in cart</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {cart.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.menuItem}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item.unitPrice)} each
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                +
                              </Button>
                              <span className="w-16 text-right font-medium text-sm">
                                {formatCurrency(item.total)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => removeFromCart(item.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal</span>
                          <span>{formatCurrency(cartTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Tax (12.5%)</span>
                          <span>{formatCurrency(tax)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total</span>
                          <span>{formatCurrency(grandTotal)}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Transaction Details */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <Label className="text-xs">Channel</Label>
                      <Select value={channel} onValueChange={setChannel}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DINE_IN">Dine-in</SelectItem>
                          <SelectItem value="TAKEOUT">Takeout</SelectItem>
                          <SelectItem value="DELIVERY">Delivery</SelectItem>
                          <SelectItem value="APP">App Order</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Payment</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Card">Card</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Mobile">Mobile Pay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Customer Count</Label>
                      <Input
                        type="number"
                        min="1"
                        value={customerCount}
                        onChange={(e) => setCustomerCount(parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsNewSaleOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitSale}
                disabled={cart.length === 0}
                className="bg-gradient-to-r from-blue-600 to-blue-700"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete Sale ({formatCurrency(grandTotal)})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Today's Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-xl font-bold">{formatCurrency(todayTotal)}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-xl font-bold">{todayCount}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Ticket</p>
                <p className="text-xl font-bold">
                  {formatCurrency(todayCount > 0 ? todayTotal / todayCount : 0)}
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Daypart</p>
                <p className="text-xl font-bold">{getDaypart()}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Today's Transactions</CardTitle>
          <CardDescription>
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale #</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="font-medium">{txn.saleNumber}</TableCell>
                  <TableCell>{txn.time}</TableCell>
                  <TableCell>{txn.items} items</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {txn.channel.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{txn.paymentMethod}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(txn.total)}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Completed
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
