"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Bell, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { sendOrderNotification } from "@/lib/actions/order-notifications";
import { NOTIFICATION_CHANNEL_STYLES, orderSectionCardClass } from "@/components/orders/order-styles";
import { cn } from "@/lib/utils";

interface Notification {
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

interface NotificationsTabProps {
  orderId: string;
  customerPhone: string | null;
  customerEmail: string | null;
  notifications: Notification[];
  onNotificationSent?: () => void;
}

export function NotificationsTab({ orderId, customerPhone, customerEmail, notifications, onNotificationSent }: NotificationsTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState("ORDER_CONFIRMED");
  const [channel, setChannel] = useState("SMS");
  const [recipient, setRecipient] = useState(customerPhone || "");
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    if (!recipient.trim() || !message.trim()) {
      toast.error("Recipient and message are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await sendOrderNotification({
        orderId,
        type: type as any,
        channel,
        recipient: recipient.trim(),
        message: message.trim(),
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Notification sent");
        setShowForm(false);
        setMessage("");
        onNotificationSent?.();
      }
    } catch {
      toast.error("Failed to send notification");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#16A34A]" />
          <span className="text-sm font-medium text-[#222831]">Notifications</span>
          <Badge variant="secondary" className="text-xs rounded-md">{notifications.length}</Badge>
        </div>
        <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-3 w-3" />Send
        </Button>
      </div>

      {showForm && (
        <div className={cn(orderSectionCardClass, "space-y-3")}>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ORDER_PLACED">Order Placed</SelectItem>
                  <SelectItem value="ORDER_CONFIRMED">Order Confirmed</SelectItem>
                  <SelectItem value="ORDER_PREPARING">Order Preparing</SelectItem>
                  <SelectItem value="ORDER_READY">Order Ready</SelectItem>
                  <SelectItem value="ORDER_DISPATCHED">Order Dispatched</SelectItem>
                  <SelectItem value="ORDER_DELIVERED">Order Delivered</SelectItem>
                  <SelectItem value="PAYMENT_RECEIVED">Payment Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMS">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Recipient</Label>
            <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={channel === "EMAIL" ? "email@example.com" : "+233..."} />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Notification message..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" className="rounded-lg bg-[#22C55E] hover:bg-[#16A34A]" onClick={handleSend} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
              Send
            </Button>
          </div>
        </div>
      )}

      {notifications.length > 0 ? (
        <div className="rounded-xl border border-border divide-y overflow-hidden">
          {[...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((n) => (
            <div key={n.id} className="px-3 py-2.5 text-sm bg-card">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs border-0", NOTIFICATION_CHANNEL_STYLES[n.channel] ?? "")}>
                    {n.channel}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{n.type.replace(/_/g, " ")}</span>
                </div>
                <Badge variant="outline" className={`text-xs ${n.status === "SENT" ? "text-green-600" : n.status === "FAILED" ? "text-red-600" : "text-amber-600"}`}>
                  {n.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{n.recipient}</p>
              <p className="text-xs mt-1">{n.message}</p>
              {n.sentAt && <p className="text-xs text-muted-foreground mt-1">{new Date(n.sentAt).toLocaleString()}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">No notifications sent yet</p>
      )}
    </div>
  );
}
