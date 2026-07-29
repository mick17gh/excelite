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
import {
  ORDER_STATUS_STYLES,
  orderModalHeaderClass,
  orderSectionCardClass,
  orderTabListClass,
} from "@/components/orders/order-styles";
import { cn } from "@/lib/utils";

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
  taxNumber?: string | null;
  showTaxNumberOnReceipt?: boolean;
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
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col rounded-2xl">
        <DialogHeader className={orderModalHeaderClass}>
          <DialogTitle className="flex items-center gap-3 text-white">
            <span className="font-mono text-lg">#{order.orderNumber}</span>
            <Badge className={cn("border-0", ORDER_STATUS_STYLES[order.status])}>
              {STATUS_LABELS[order.status]}
            </Badge>
          </DialogTitle>
          <p className="text-sm text-white/60 font-normal">
            {order.branchName} · {SOURCE_LABELS[order.source] || order.source}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className={cn(orderSectionCardClass, "grid grid-cols-2 gap-3 text-sm")}>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Type</p>
              <p className="font-medium text-[#222831]">{TYPE_LABELS[order.type] || order.type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Date</p>
              <p className="font-medium text-[#222831]">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Placed by</p>
              <p className="font-medium text-[#222831]">{order.placedBy || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment</p>
              <p className="font-medium text-[#16A34A]">{order.paymentStatus}</p>
            </div>
          </div>

          {order.customerName && (
            <div className={orderSectionCardClass}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Customer</p>
              <p className="font-medium text-[#222831]">{order.customerName}</p>
              {order.customerPhone && (
                <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
              )}
            </div>
          )}

          {order.deliveryAddress && (
            <div className={orderSectionCardClass}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Delivery</p>
              <p className="font-medium text-[#222831]">{order.deliveryAddress}</p>
              {order.deliveryCity && <p className="text-sm text-muted-foreground">{order.deliveryCity}</p>}
              {order.deliveryNeighborhood && (
                <p className="text-sm text-muted-foreground">{order.deliveryNeighborhood}</p>
              )}
              {order.deliveryPhone && <p className="text-sm text-muted-foreground">{order.deliveryPhone}</p>}
              {order.deliveryNotes && (
                <p className="text-sm text-muted-foreground italic mt-1">{order.deliveryNotes}</p>
              )}
              {order.deliveryStatus && (
                <Badge variant="outline" className="mt-2 rounded-md">
                  {order.deliveryStatus}
                </Badge>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Items ({order.items.length})
            </p>
            <div className="rounded-xl border border-border divide-y overflow-hidden">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-3 py-2.5 text-sm bg-card hover:bg-muted/20"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-[#222831]">{item.menuItemName}</span>
                    <span className="ml-2 text-muted-foreground">×{item.quantity}</span>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">{item.notes}</p>
                    )}
                  </div>
                  <span className="font-semibold text-[#16A34A] shrink-0 ml-2">
                    {formatCurrency(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={orderSectionCardClass}>
            {showTaxBreakdown ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
            ) : null}
            {showTaxBreakdown && order.tax > 0 ? (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">{receiptTaxLabel(receiptDisplay)}</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
            ) : null}
            {order.discount > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-red-500">-{formatCurrency(order.discount)}</span>
              </div>
            )}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Delivery fee</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-base text-[#222831]">
              <span>Total</span>
              <span className="text-[#16A34A]">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {shouldShowInclusiveFootnote(receiptDisplay) ? (
            <p className="text-xs text-muted-foreground text-center">
              Prices include {order.taxName || "tax"}
            </p>
          ) : null}

          {order.notes && (
            <div className={orderSectionCardClass}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}

          {(order.status === "NEW" || order.status === "IN_PROGRESS") && (
            <div className="flex justify-center">
              <Button
                onClick={handleSendToKitchen}
                disabled={isSendingToKitchen}
                variant="outline"
                className="rounded-xl border-white/30 hover:bg-white/15 hover:text-white"
              >
                {isSendingToKitchen ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChefHat className="mr-2 h-4 w-4" />
                )}
                {isSendingToKitchen ? "Sending..." : "Send to kitchen"}
              </Button>
            </div>
          )}

          <Tabs defaultValue="payment" className="w-full">
            <TabsList className={orderTabListClass}>
              <TabsTrigger
                value="payment"
                className="flex-1 rounded-lg data-[state=active]:bg-[#22C55E] data-[state=active]:text-white"
              >
                Payment
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex-1 rounded-lg data-[state=active]:bg-[#22C55E] data-[state=active]:text-white"
              >
                Notifications
              </TabsTrigger>
              <TabsTrigger
                value="receipt"
                className="flex-1 rounded-lg data-[state=active]:bg-[#22C55E] data-[state=active]:text-white"
              >
                Receipt
              </TabsTrigger>
            </TabsList>
            <TabsContent value="payment" className="mt-3">
              <PaymentPanel
                orderId={order.id}
                orderNumber={order.orderNumber}
                orderTotal={order.total}
                paymentStatus={order.paymentStatus}
                orderStatus={order.status}
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
                taxNumber={order.taxNumber}
                showTaxNumberOnReceipt={order.showTaxNumberOnReceipt}
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
