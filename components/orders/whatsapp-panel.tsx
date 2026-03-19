"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, User, Bot, RefreshCw } from "lucide-react";
import { getWhatsAppMessages } from "@/lib/actions/whatsapp";

interface WhatsAppMessage {
  id: string;
  sessionId: string;
  direction: string;
  content: string;
  messageType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface WhatsAppSession {
  id: string;
  phoneNumber: string;
  customerId: string | null;
  customerName: string | null;
  state: string;
  messageCount: number;
  lastMessageAt: string;
}

interface WhatsAppPanelProps {
  session: WhatsAppSession;
}

const STATE_COLORS: Record<string, string> = {
  IDLE: "bg-slate-100 text-slate-700",
  GREETING: "bg-blue-100 text-blue-700",
  BROWSING_MENU: "bg-purple-100 text-purple-700",
  ADDING_ITEMS: "bg-amber-100 text-amber-700",
  CONFIRMING_ORDER: "bg-emerald-100 text-emerald-700",
  AWAITING_PAYMENT: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
};

export function WhatsAppPanel({ session }: WhatsAppPanelProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const result = await getWhatsAppMessages(session.id);
      setMessages(result.data || []);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [session.id]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">{session.phoneNumber}</span>
          <Badge className={`text-xs ${STATE_COLORS[session.state] || ""}`}>{session.state}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={loadMessages} disabled={isLoading}>
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {session.customerName && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>Linked to: <strong className="text-foreground">{session.customerName}</strong></span>
        </div>
      )}

      <ScrollArea className="h-[300px] border rounded-md p-2">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No messages</p>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.direction === "inbound" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                    msg.direction === "inbound"
                      ? "bg-muted"
                      : "bg-green-100 dark:bg-green-900/30"
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    {msg.direction === "inbound" ? (
                      <User className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Bot className="h-3 w-3 text-green-600" />
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="text-xs text-muted-foreground text-center">
        {session.messageCount} messages · Last: {new Date(session.lastMessageAt).toLocaleString()}
      </div>
    </div>
  );
}
