"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { AlertType, AlertSeverity } from "@/lib/generated/prisma/client";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export type NotificationType =
  | "alert"
  | "order"
  | "inventory"
  | "staff"
  | "system"
  | "report";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface CreateNotificationInput {
  userId?: string; // If null, it's a broadcast
  branchId?: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// Note: This requires a Notification model in the schema. If it doesn't exist,
// we'll store notifications in memory or use the Alert model as a fallback.

/**
 * Create a notification for a user or broadcast to all users
 */
export async function createNotification(input: CreateNotificationInput) {
  try {
    // Check if Notification model exists, otherwise use Alert model
    // For now, we'll use the Alert model as a fallback

    const alert = await db.alert.create({
      data: {
        type: mapTypeToAlertType(input.type),
        severity: mapPriorityToSeverity(input.priority),
        title: input.title,
        message: input.message,
        branchId: input.branchId || undefined,
        triggeredAt: new Date(),
        status: "ACTIVE",
      },
    });

    revalidatePath("/dashboard");
    return { success: true, data: { id: alert.id } };
  } catch (error) {
    console.error("[createNotification] Error:", error);
    return { success: false, error: "Failed to create notification" };
  }
}

/**
 * Get notifications for the current user
 */
export async function getNotifications(limit: number = 20) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated", data: [] };
    }

    // Get user's branch if any
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { branchId: true, role: true },
    });

    // Get alerts as notifications
    const alerts = await db.alert.findMany({
      where: {
        status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
        // Filter by branch for branch-level users
        ...(user?.branchId &&
          user.role !== "CEO" &&
          user.role !== "SENIOR_MANAGEMENT"
          ? { branchId: user.branchId }
          : {}),
      },
      orderBy: { triggeredAt: "desc" },
      take: limit,
      include: {
        branch: {
          select: { name: true },
        },
      },
    });

    const notifications = alerts.map((alert) => ({
      id: alert.id,
      type: mapAlertTypeToType(alert.type),
      priority: mapSeverityToPriority(alert.severity),
      title: alert.title,
      message: alert.message,
      branchName: alert.branch?.name,
      createdAt: alert.triggeredAt,
      isRead: alert.status === "ACKNOWLEDGED" || alert.status === "RESOLVED",
      actionUrl: getActionUrl(alert.type, alert.branchId),
    }));

    return { success: true, data: notifications };
  } catch (error) {
    console.error("[getNotifications] Error:", error);
    return { success: false, error: "Failed to fetch notifications", data: [] };
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    await db.alert.update({
      where: { id: notificationId },
      data: { status: "ACKNOWLEDGED" },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[markNotificationAsRead] Error:", error);
    return { success: false, error: "Failed to mark notification as read" };
  }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsRead() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { branchId: true, role: true },
    });

    await db.alert.updateMany({
      where: {
        status: "ACTIVE",
        ...(user?.branchId &&
          user.role !== "CEO" &&
          user.role !== "SENIOR_MANAGEMENT"
          ? { branchId: user.branchId }
          : {}),
      },
      data: { status: "ACKNOWLEDGED" },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[markAllNotificationsAsRead] Error:", error);
    return { success: false, error: "Failed to mark notifications as read" };
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, count: 0 };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { branchId: true, role: true },
    });

    const count = await db.alert.count({
      where: {
        status: "ACTIVE",
        ...(user?.branchId &&
          user.role !== "CEO" &&
          user.role !== "SENIOR_MANAGEMENT"
          ? { branchId: user.branchId }
          : {}),
      },
    });

    return { success: true, count };
  } catch (error) {
    console.error("[getUnreadCount] Error:", error);
    return { success: false, count: 0 };
  }
}

/**
 * Dismiss a notification
 */
export async function dismissNotification(notificationId: string) {
  try {
    await db.alert.update({
      where: { id: notificationId },
      data: { status: "DISMISSED" },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[dismissNotification] Error:", error);
    return { success: false, error: "Failed to dismiss notification" };
  }
}

// Helper functions to map between notification types and alert types

function mapTypeToAlertType(type: NotificationType): AlertType {
  switch (type) {
    case "alert":
      return "SALES_DROP";
    case "order":
      return "TARGET_ACHIEVED";
    case "inventory":
      return "LOW_STOCK";
    case "staff":
      return "STAFF_SHORTAGE";
    case "report":
      return "TARGET_ACHIEVED";
    case "system":
      return "SALES_DROP";
    default:
      return "SALES_DROP";
  }
}

function mapAlertTypeToType(alertType: string): NotificationType {
  if (alertType.includes("STOCK")) return "inventory";
  if (alertType.includes("STAFF")) return "staff";
  if (alertType.includes("ORDER")) return "order";
  if (alertType.includes("REPORT")) return "report";
  return "alert";
}

function mapPriorityToSeverity(priority: NotificationPriority): AlertSeverity {
  switch (priority) {
    case "low":
      return "LOW";
    case "medium":
      return "MEDIUM";
    case "high":
      return "HIGH";
    case "urgent":
      return "CRITICAL";
    default:
      return "MEDIUM";
  }
}

function mapSeverityToPriority(severity: string): NotificationPriority {
  switch (severity) {
    case "low":
      return "low";
    case "medium":
      return "medium";
    case "high":
      return "high";
    case "critical":
      return "urgent";
    default:
      return "medium";
  }
}

function getActionUrl(alertType: string, _branchId?: string | null): string | undefined {
  if (alertType.includes("STOCK")) return "/dashboard/inventory";
  if (alertType.includes("STAFF")) return "/dashboard/staff";
  if (alertType.includes("SALES")) return "/dashboard/sales";
  if (alertType.includes("WASTE")) return "/dashboard/inventory";
  return "/dashboard/alerts";
}

// Convenience functions for creating specific notification types

export async function notifyLowStock(itemName: string, branchId: string, currentStock: number) {
  return createNotification({
    branchId,
    type: "inventory",
    priority: "high",
    title: "Low Stock Alert",
    message: `${itemName} is running low (${currentStock} remaining)`,
    actionUrl: "/dashboard/inventory",
  });
}

export async function notifyNewOrder(orderNumber: string, branchId: string, total: number) {
  return createNotification({
    branchId,
    type: "order",
    priority: "medium",
    title: "New Order",
    message: `Order ${orderNumber} received (Total: GH₵ ${total.toFixed(2)})`,
    actionUrl: "/kitchen",
  });
}

export async function notifyStaffShortage(branchName: string, branchId: string, shortfall: number) {
  return createNotification({
    branchId,
    type: "staff",
    priority: "high",
    title: "Staff Shortage",
    message: `${branchName} is understaffed by ${shortfall} employee(s)`,
    actionUrl: "/dashboard/staff",
  });
}

export async function notifyReportReady(reportName: string, userId?: string) {
  return createNotification({
    userId,
    type: "report",
    priority: "low",
    title: "Report Ready",
    message: `Your ${reportName} report is ready to download`,
    actionUrl: "/dashboard/reports",
  });
}

export async function notifySystemAlert(title: string, message: string, priority: NotificationPriority = "medium") {
  return createNotification({
    type: "system",
    priority,
    title,
    message,
  });
}
