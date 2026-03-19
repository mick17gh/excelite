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
}

const CHANNEL_COLORS: Record<string, string> = {
  SMS: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  EMAIL: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  WHATSAPP: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export function NotificationsTab({ orderId, customerPhone, customerEmail, notifications }: NotificationsTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState("ORDER_UPDATE");
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
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Notifications</span>
          <Badge variant="secondary" className="text-xs">{notifications.length}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-3 w-3" />Send
        </Button>
      </div>

      {showForm && (
        <div className="border rounded-md p-3 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ORDER_UPDATE">Order Update</SelectItem>
                  <SelectItem value="ORDER_CONFIRMATION">Confirmation</SelectItem>
                  <SelectItem value="DELIVERY_UPDATE">Delivery Update</SelectItem>
                  <SelectItem value="PAYMENT_CONFIRMATION">Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Channel</Label>
              <Select value={channel} onValueChange={(v) => {
                setChannel(v);
                if (v === "EMAIL") setRecipient(customerEmail || "");
                else setRecipient(customerPhone || "");
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
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
            <Button size="sm" onClick={handleSend} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
              Send
            </Button>
          </div>
        </div>
      )}

      {notifications.length > 0 ? (
        <div className="border rounded-md divide-y">
          {notifications.map((n) => (
            <div key={n.id} className="px-3 py-2 text-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${CHANNEL_COLORS[n.channel] || ""}`}>{n.channel}</Badge>
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
