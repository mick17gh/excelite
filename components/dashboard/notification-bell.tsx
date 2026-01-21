"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  AlertCircle,
  Package,
  Users,
  ShoppingCart,
  FileText,
  Settings,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  getUnreadCount,
} from "@/lib/services/notifications";

interface Notification {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  branchName?: string;
  createdAt: Date;
  isRead: boolean;
  actionUrl?: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  // Load notifications on mount and periodically
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Load notifications when popover opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const result = await getNotifications(20);
      if (result.success && result.data) {
        setNotifications(result.data as Notification[]);
      }
    } catch {
      console.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const result = await getUnreadCount();
      if (result.success) {
        setUnreadCount(result.count);
      }
    } catch {
      console.error("Failed to load unread count");
    }
  };

  const handleMarkAsRead = async (id: string) => {
    startTransition(async () => {
      const result = await markNotificationAsRead(id);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    });
  };

  const handleDismiss = async (id: string) => {
    startTransition(async () => {
      const result = await dismissNotification(id);
      if (result.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    });
  };

  const handleMarkAllAsRead = async () => {
    startTransition(async () => {
      const result = await markAllNotificationsAsRead();
      if (result.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "inventory":
        return <Package className="h-4 w-4" />;
      case "staff":
        return <Users className="h-4 w-4" />;
      case "order":
        return <ShoppingCart className="h-4 w-4" />;
      case "report":
        return <FileText className="h-4 w-4" />;
      case "system":
        return <Settings className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-red-500 bg-red-50 dark:bg-red-950/30";
      case "high":
        return "border-orange-500 bg-orange-50 dark:bg-orange-950/30";
      case "medium":
        return "border-blue-500 bg-blue-50 dark:bg-blue-950/30";
      default:
        return "border-slate-200 bg-slate-50 dark:bg-slate-950/30";
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "inventory":
        return "text-amber-600";
      case "staff":
        return "text-purple-600";
      case "order":
        return "text-blue-600";
      case "report":
        return "text-green-600";
      case "system":
        return "text-slate-600";
      default:
        return "text-red-600";
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1.5 text-[10px] bg-red-500 text-white border-0"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllAsRead}
              disabled={isPending}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "px-4 py-3 transition-colors hover:bg-muted/50",
                    !notification.isRead && "bg-muted/30"
                  )}
                >
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        "mt-0.5 rounded-full p-1.5 border",
                        getPriorityColor(notification.priority)
                      )}
                    >
                      <div className={getIconColor(notification.type)}>
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm truncate",
                          !notification.isRead && "font-medium"
                        )}>
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={isPending}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDismiss(notification.id)}
                            disabled={isPending}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {notification.branchName && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                            {notification.branchName}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-8"
              onClick={() => {
                setIsOpen(false);
                window.location.href = "/dashboard/alerts";
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
