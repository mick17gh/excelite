"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrency } from "@/contexts/currency-context";
import { PaymentPanel } from "./payment-panel";
import { NotificationsTab } from "./notifications-tab";
import { ReceiptPanel } from "./receipt-panel";
import { Button } from "@/components/ui/button";
import { ChefHat, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendOrderToKitchen } from "@/lib/actions/orders";
import { useState } from "react";
import {
  receiptTaxLabel,
  shouldShowInclusiveFootnote,
  shouldShowTaxBreakdown,
} from "@/lib/services/receipt-display";

interface OrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  menuItemSku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes: string | null;
}

interface PaymentItem {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  paymentMethod?: string | null;
  paidAt: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  branchId: string;
  branchName: string;
  branchCode: string;
  taxInclusive?: boolean;
  showTaxOnReceipt?: boolean;
  taxName?: string;
  taxRate?: number;
  taxEnabled?: boolean;
  assignedBy: string | null;
  placedBy?: string | null;
  source: string;
  type: string;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string | null;
  paymentStatus: string;
  paystackEnabled?: boolean;
  notes: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryNeighborhood?: string | null;
  deliveryPhone: string | null;
  deliveryNotes: string | null;
  orderReceivedTime?: string | null;
  deliveryStatus: string | null;
  items: OrderItem[];
  payments: PaymentItem[];
  notifications: NotificationItem[];
  receipt: ReceiptData | null;
  createdAt: string;
  updatedAt: string;
}

interface NotificationItem {
  id: string;
  orderId: string;
  type: string;
  channel: string;
  recipient: string;
  subject: string | null;
  message: string;
  status: string;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
}

interface ReceiptData {
  id: string;
  orderId: string;
  receiptNumber: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  items: { name: string; sku: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  tax: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  pdfUrl: string | null;
  sentVia: string[];
  createdAt: string;
}

interface OrderDetailModalProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  READY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const SOURCE_LABELS: Record<string, string> = {
  CALL_CENTER: "Call Center",
  ONLINE: "Online",
  WHATSAPP: "WhatsApp",
  WALK_IN: "Walk-in",
  POS: "POS",
  SOCIAL_MEDIA: "Social Media",
};

const TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Dine In",
  TAKEOUT: "Takeout",
  DELIVERY: "Delivery",
  APP: "App",
};

export function OrderDetailModal({ order, open, onOpenChange, onRefresh }: OrderDetailModalProps) {
  const { formatCurrency } = useCurrency();
  const receiptDisplay = {
    showTaxOnReceipt: order.showTaxOnReceipt ?? true,
    taxInclusive: order.taxInclusive ?? false,
    taxName: order.taxName,
    taxRate: order.taxRate,
    tax: order.tax,
    subtotal: order.subtotal,
  };
  const showTaxBreakdown = shouldShowTaxBreakdown(receiptDisplay);
  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);

  const handleSendToKitchen = async () => {
    setIsSendingToKitchen(true);
    try {
      const result = await sendOrderToKitchen({ orderId: order.id });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Order sent to kitchen successfully");
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch {
      toast.error("Failed to send order to kitchen");
    } finally {
      setIsSendingToKitchen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono">{order.orderNumber}</span>
            <Badge className={STATUS_COLORS[order.status]}>{STATUS_LABELS[order.status]}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Branch</p>
              <p className="font-medium">{order.branchName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Source</p>
              <p className="font-medium">{SOURCE_LABELS[order.source] || order.source}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium">{TYPE_LABELS[order.type] || order.type}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Placed By</p>
              <p className="font-medium">{order.placedBy || "—"}</p>
            </div>
          </div>

          {/* Customer */}
          {order.customerName && (
            <>
              <Separator />
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Customer</p>
                <p className="font-medium">{order.customerName}</p>
                {order.customerPhone && <p className="text-muted-foreground">{order.customerPhone}</p>}
              </div>
            </>
          )}

          {/* Delivery */}
          {order.deliveryAddress && (
            <>
              <Separator />
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Delivery</p>
                <p className="font-medium">{order.deliveryAddress}</p>
                {order.deliveryCity && <p className="text-muted-foreground">{order.deliveryCity}</p>}
                {order.deliveryNeighborhood && <p className="text-muted-foreground">{order.deliveryNeighborhood}</p>}
                {order.deliveryPhone && <p className="text-muted-foreground">{order.deliveryPhone}</p>}
                {order.deliveryNotes && <p className="text-muted-foreground italic">{order.deliveryNotes}</p>}
                {order.deliveryStatus && (
                  <Badge variant="outline" className="mt-1">{order.deliveryStatus}</Badge>
                )}
              </div>
            </>
          )}

          {order.orderReceivedTime && (
            <div className="text-sm">
              <p className="text-muted-foreground">Order Received Time</p>
              <p className="font-medium">{new Date(order.orderReceivedTime).toLocaleString()}</p>
            </div>
          )}

          <Separator />

          {/* Items */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Items ({order.items.length})</p>
            <div className="border rounded-md divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{item.menuItemName}</span>
                    <span className="ml-2 text-muted-foreground">x{item.quantity}</span>
                    {item.notes && <p className="text-xs text-muted-foreground italic">{item.notes}</p>}
                  </div>
                  <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border rounded-md p-3 space-y-1 text-sm">
            {showTaxBreakdown ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
            ) : null}
            {showTaxBreakdown && order.tax > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{receiptTaxLabel(receiptDisplay)}</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
            ) : null}
            {order.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-red-500">-{formatCurrency(order.discount)}</span>
              </div>
            )}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {shouldShowInclusiveFootnote(receiptDisplay) ? (
            <p className="text-xs text-muted-foreground text-center">
              Prices include {order.taxName || "tax"}
            </p>
          ) : null}

          {/* Notes */}
          {order.notes && (
            <div className="text-sm">
              <p className="text-muted-foreground mb-1">Notes</p>
              <p>{order.notes}</p>
            </div>
          )}

          <Separator />

          {/* Send to Kitchen Button */}
          {(order.status === "NEW" || order.status === "IN_PROGRESS") && (
            <div className="flex justify-center">
              <Button
                onClick={handleSendToKitchen}
                disabled={isSendingToKitchen}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isSendingToKitchen ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChefHat className="mr-2 h-4 w-4" />
                )}
                {isSendingToKitchen ? "Sending..." : "Send to Kitchen"}
              </Button>
            </div>
          )}

          <Separator />

          {/* Tabbed Panels */}
          <Tabs defaultValue="payment" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="payment" className="flex-1">Payment</TabsTrigger>
              <TabsTrigger value="notifications" className="flex-1">Notifications</TabsTrigger>
              <TabsTrigger value="receipt" className="flex-1">Receipt</TabsTrigger>
            </TabsList>
            <TabsContent value="payment" className="mt-3">
              <PaymentPanel
                orderId={order.id}
                orderNumber={order.orderNumber}
                orderTotal={order.total}
                paymentStatus={order.paymentStatus}
                paystackEnabled={order.paystackEnabled}
                customerPhone={order.customerPhone}
                customerEmail={null}
                payments={order.payments}
                onRefresh={onRefresh}
              />
            </TabsContent>
            <TabsContent value="notifications" className="mt-3">
              <NotificationsTab
                orderId={order.id}
                customerPhone={order.customerPhone}
                customerEmail={null}
                notifications={order.notifications || []}
                onNotificationSent={onRefresh}
              />
            </TabsContent>
            <TabsContent value="receipt" className="mt-3">
              <ReceiptPanel
                orderId={order.id}
                orderNumber={order.orderNumber}
                branchName={order.branchName}
                branchCode={order.branchCode}
                customerName={order.customerName}
                customerPhone={order.customerPhone}
                customerEmail={null}
                paymentMethod={order.paymentMethod}
                receipt={order.receipt || null}
                taxInclusive={order.taxInclusive}
                showTaxOnReceipt={order.showTaxOnReceipt}
                taxName={order.taxName}
                taxRate={order.taxRate}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
