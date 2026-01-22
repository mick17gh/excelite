"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { AlertType, AlertSeverity, AlertStatus } from "@/lib/generated/prisma/client";

export async function getAlerts(branchId?: string, status?: AlertStatus) {
  try {
    const alerts = await db.alert.findMany({
      where: {
        ...(branchId && { branchId }),
        ...(status && { status }),
      },
      include: {
        branch: true,
      },
      orderBy: { triggeredAt: "desc" },
    });

    const formattedAlerts = alerts.map((alert) => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity.toLowerCase() as "low" | "medium" | "high" | "critical",
      status: alert.status,
      title: alert.title,
      message: alert.message,
      branchName: alert.branch?.name,
      triggeredAt: alert.triggeredAt,
      resolvedAt: alert.resolvedAt,
    }));

    return { success: true, data: formattedAlerts };
  } catch (error) {
    console.error("[getAlerts] Error:", error);
    return { success: false, error: "Failed to fetch alerts", data: [] };
  }
}

export async function getActiveAlerts(branchIds?: string[]) {
  try {
    const alerts = await db.alert.findMany({
      where: {
        status: "ACTIVE",
        ...(branchIds && branchIds.length > 0 && { branchId: { in: branchIds } }),
      },
      include: {
        branch: true,
      },
      orderBy: { triggeredAt: "desc" },
      take: 10,
    });

    const formattedAlerts = alerts.map((alert) => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity.toLowerCase() as "low" | "medium" | "high" | "critical",
      title: alert.title,
      message: alert.message,
      branchName: alert.branch?.name,
      triggeredAt: alert.triggeredAt,
    }));

    return { success: true, data: formattedAlerts };
  } catch (error) {
    console.error("[getActiveAlerts] Error:", error);
    return { success: false, error: "Failed to fetch active alerts", data: [] };
  }
}

export async function acknowledgeAlert(id: string) {
  try {
    const alert = await db.alert.update({
      where: { id },
      data: { status: "ACKNOWLEDGED" },
    });

    revalidatePath("/dashboard/alerts");
    return { success: true, data: alert };
  } catch (error) {
    console.error("[acknowledgeAlert] Error:", error);
    return { success: false, error: "Failed to acknowledge alert" };
  }
}

export async function resolveAlert(id: string, resolvedBy: string) {
  try {
    const alert = await db.alert.update({
      where: { id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedBy,
      },
    });

    revalidatePath("/dashboard/alerts");
    return { success: true, data: alert };
  } catch (error) {
    console.error("[resolveAlert] Error:", error);
    return { success: false, error: "Failed to resolve alert" };
  }
}

export async function dismissAlert(id: string) {
  try {
    const alert = await db.alert.update({
      where: { id },
      data: { status: "DISMISSED" },
    });

    revalidatePath("/dashboard/alerts");
    return { success: true, data: alert };
  } catch (error) {
    console.error("[dismissAlert] Error:", error);
    return { success: false, error: "Failed to dismiss alert" };
  }
}

export interface CreateAlertInput {
  branchId?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export async function createAlert(input: CreateAlertInput) {
  try {
    const alert = await db.alert.create({
      data: {
        branchId: input.branchId,
        type: input.type,
        severity: input.severity,
        title: input.title,
        message: input.message,
        data: input.data ? JSON.parse(JSON.stringify(input.data)) : undefined,
        status: "ACTIVE",
      },
    });

    revalidatePath("/dashboard/alerts");
    revalidatePath("/dashboard");
    return { success: true, data: alert };
  } catch (error) {
    console.error("[createAlert] Error:", error);
    return { success: false, error: "Failed to create alert" };
  }
}

export async function triggerAlertGeneration() {
  try {
    const { runAlertChecks } = await import("@/lib/services/alert-checker");
    const result = await runAlertChecks();
    
    revalidatePath("/dashboard/alerts");
    revalidatePath("/dashboard");
    
    return { 
      success: true, 
      data: {
        checked: result.checked,
        alertsCreated: result.alertsCreated,
        errors: result.errors
      }
    };
  } catch (error) {
    console.error("[triggerAlertGeneration] Error:", error);
    return { success: false, error: "Failed to generate alerts" };
  }
}

export async function checkAndGenerateAlerts() {
  try {
    // Check for low stock items
    const lowStockItems = await db.inventoryItem.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      include: {
        branch: true,
      },
    });

    for (const item of lowStockItems) {
      if (Number(item.currentStock) <= Number(item.reorderPoint)) {
        // Check if alert already exists
        const existingAlert = await db.alert.findFirst({
          where: {
            branchId: item.branchId,
            type: "LOW_STOCK",
            status: "ACTIVE",
            data: {
              path: ["itemId"],
              equals: item.id,
            },
          },
        });

        if (!existingAlert) {
          await db.alert.create({
            data: {
              branchId: item.branchId,
              type: "LOW_STOCK",
              severity: Number(item.currentStock) <= Number(item.minStock) ? "HIGH" : "MEDIUM",
              title: `Low Stock: ${item.name}`,
              message: `${item.name} at ${item.branch.name} is running low. Current stock: ${item.currentStock} ${item.unit}`,
              data: { itemId: item.id, currentStock: Number(item.currentStock) },
              status: "ACTIVE",
            },
          });
        }
      }
    }

    // Check for underperforming branches
    const branches = await db.branch.findMany({
      where: { deletedAt: null, isActive: true },
      include: {
        targets: {
          where: { isActive: true, targetType: "REVENUE" },
        },
        sales: {
          where: {
            saleDate: {
              gte: new Date(new Date().setDate(new Date().getDate() - 7)),
            },
          },
        },
      },
    });

    for (const branch of branches) {
      const weeklyRevenue = branch.sales.reduce((sum, s) => sum + Number(s.total), 0);
      const weeklyTarget = branch.targets[0]
        ? Number(branch.targets[0].targetValue) / 4
        : 25000;

      if (weeklyRevenue < weeklyTarget * 0.7) {
        const existingAlert = await db.alert.findFirst({
          where: {
            branchId: branch.id,
            type: "UNDERPERFORMING_BRANCH",
            status: "ACTIVE",
          },
        });

        if (!existingAlert) {
          await db.alert.create({
            data: {
              branchId: branch.id,
              type: "UNDERPERFORMING_BRANCH",
              severity: weeklyRevenue < weeklyTarget * 0.5 ? "CRITICAL" : "HIGH",
              title: `Underperforming: ${branch.name}`,
              message: `${branch.name} is at ${Math.round((weeklyRevenue / weeklyTarget) * 100)}% of weekly target`,
              data: { weeklyRevenue, weeklyTarget },
              status: "ACTIVE",
            },
          });
        }
      }
    }

    revalidatePath("/dashboard/alerts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[checkAndGenerateAlerts] Error:", error);
    return { success: false, error: "Failed to generate alerts" };
  }
}
