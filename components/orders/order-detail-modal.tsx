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
  assignedBy: string | null;
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
  notes: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryPhone: string | null;
  deliveryNotes: string | null;
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
};

const TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Dine In",
  TAKEOUT: "Takeout",
  DELIVERY: "Delivery",
  APP: "App",
};

export function OrderDetailModal({ order, open, onOpenChange }: OrderDetailModalProps) {
  const { formatCurrency } = useCurrency();

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
                {order.deliveryPhone && <p className="text-muted-foreground">{order.deliveryPhone}</p>}
                {order.deliveryNotes && <p className="text-muted-foreground italic">{order.deliveryNotes}</p>}
                {order.deliveryStatus && (
                  <Badge variant="outline" className="mt-1">{order.deliveryStatus}</Badge>
                )}
              </div>
            </>
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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
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

          {/* Notes */}
          {order.notes && (
            <div className="text-sm">
              <p className="text-muted-foreground mb-1">Notes</p>
              <p>{order.notes}</p>
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
                orderTotal={order.total}
                paymentStatus={order.paymentStatus}
                payments={order.payments}
              />
            </TabsContent>
            <TabsContent value="notifications" className="mt-3">
              <NotificationsTab
                orderId={order.id}
                customerPhone={order.customerPhone}
                customerEmail={null}
                notifications={order.notifications || []}
              />
            </TabsContent>
            <TabsContent value="receipt" className="mt-3">
              <ReceiptPanel
                orderId={order.id}
                customerName={order.customerName}
                customerPhone={order.customerPhone}
                customerEmail={null}
                paymentMethod={order.paymentMethod}
                receipt={order.receipt || null}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
