"use server";

import { db } from "@/lib/db";
import { sendAlertEmail, sendLowStockAlertEmail } from "./email";

/**
 * Automated Alert Checker Service
 * 
 * This service checks for various conditions and creates alerts automatically.
 * It should be called by a scheduled job (cron) at regular intervals.
 */

export interface AlertCheckResult {
  checked: string[];
  alertsCreated: number;
  errors: string[];
}

/**
 * Run all alert checks
 */
export async function runAlertChecks(): Promise<AlertCheckResult> {
  const result: AlertCheckResult = {
    checked: [],
    alertsCreated: 0,
    errors: [],
  };

  try {
    // Check low stock
    const lowStockResult = await checkLowStock();
    result.checked.push("low_stock");
    result.alertsCreated += lowStockResult.created;

    // Check overstock
    const overstockResult = await checkOverstock();
    result.checked.push("overstock");
    result.alertsCreated += overstockResult.created;

    // Check sales drop
    const salesDropResult = await checkSalesDrop();
    result.checked.push("sales_drop");
    result.alertsCreated += salesDropResult.created;

    // Check staff shortage
    const staffShortageResult = await checkStaffShortage();
    result.checked.push("staff_shortage");
    result.alertsCreated += staffShortageResult.created;

    // Check waste spike
    const wasteSpikeResult = await checkWasteSpike();
    result.checked.push("waste_spike");
    result.alertsCreated += wasteSpikeResult.created;

    // Check target progress
    const targetResult = await checkTargetProgress();
    result.checked.push("target_progress");
    result.alertsCreated += targetResult.created;

  } catch (error) {
    console.error("[runAlertChecks] Error:", error);
    result.errors.push(String(error));
  }

  return result;
}

/**
 * Check for low stock items
 */
export async function checkLowStock(): Promise<{ created: number; items: string[] }> {
  try {
    // Find items where current stock is at or below reorder point
    const lowStockItems = await db.inventoryItem.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    const itemsNeedingAlert = lowStockItems.filter(
      (item) => Number(item.currentStock) <= Number(item.reorderPoint)
    );

    if (itemsNeedingAlert.length === 0) {
      return { created: 0, items: [] };
    }

    // Group by branch
    const byBranch = new Map<string, typeof itemsNeedingAlert>();
    itemsNeedingAlert.forEach((item) => {
      const branchId = item.branchId;
      if (!byBranch.has(branchId)) {
        byBranch.set(branchId, []);
      }
      byBranch.get(branchId)!.push(item);
    });

    let created = 0;
    const alertedItems: string[] = [];

    for (const [branchId, items] of byBranch) {
      // Check if we already have an active low stock alert for this branch today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingAlert = await db.alert.findFirst({
        where: {
          branchId,
          type: "LOW_STOCK",
          status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
          triggeredAt: { gte: today },
        },
      });

      if (existingAlert) continue;

      // Create alert
      await db.alert.create({
        data: {
          branchId,
          type: "LOW_STOCK",
          severity: items.length > 5 ? "HIGH" : items.length > 2 ? "MEDIUM" : "LOW",
          title: `Low Stock: ${items.length} item${items.length > 1 ? "s" : ""} need reordering`,
          message: `The following items are at or below reorder point: ${items.map((i) => i.name).join(", ")}`,
          status: "ACTIVE",
          triggeredAt: new Date(),
          data: {
            items: items.map((i) => ({
              id: i.id,
              name: i.name,
              currentStock: Number(i.currentStock),
              reorderPoint: Number(i.reorderPoint),
            })),
          },
        },
      });

      created++;
      alertedItems.push(...items.map((i) => i.name));
    }

    return { created, items: alertedItems };
  } catch (error) {
    console.error("[checkLowStock] Error:", error);
    return { created: 0, items: [] };
  }
}

/**
 * Check for overstock items
 */
export async function checkOverstock(): Promise<{ created: number }> {
  try {
    const overstockItems = await db.inventoryItem.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    const itemsNeedingAlert = overstockItems.filter(
      (item) => Number(item.currentStock) > Number(item.maxStock) * 1.2
    );

    if (itemsNeedingAlert.length === 0) {
      return { created: 0 };
    }

    const byBranch = new Map<string, typeof itemsNeedingAlert>();
    itemsNeedingAlert.forEach((item) => {
      if (!byBranch.has(item.branchId)) {
        byBranch.set(item.branchId, []);
      }
      byBranch.get(item.branchId)!.push(item);
    });

    let created = 0;

    for (const [branchId, items] of byBranch) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingAlert = await db.alert.findFirst({
        where: {
          branchId,
          type: "OVERSTOCK",
          status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
          triggeredAt: { gte: today },
        },
      });

      if (existingAlert) continue;

      await db.alert.create({
        data: {
          branchId,
          type: "OVERSTOCK",
          severity: "LOW",
          title: `Overstock: ${items.length} item${items.length > 1 ? "s" : ""} above maximum`,
          message: `The following items exceed maximum stock levels: ${items.map((i) => i.name).join(", ")}`,
          status: "ACTIVE",
          triggeredAt: new Date(),
        },
      });

      created++;
    }

    return { created };
  } catch (error) {
    console.error("[checkOverstock] Error:", error);
    return { created: 0 };
  }
}

/**
 * Check for significant sales drops compared to previous period
 */
export async function checkSalesDrop(): Promise<{ created: number }> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const branches = await db.branch.findMany({
      where: { deletedAt: null, isActive: true },
    });

    let created = 0;

    for (const branch of branches) {
      // Get yesterday's sales
      const yesterdaySales = await db.sale.aggregate({
        where: {
          branchId: branch.id,
          deletedAt: null,
          saleDate: { gte: yesterdayStart, lt: todayStart },
        },
        _sum: { total: true },
      });

      // Get same day last week
      const lastWeekSales = await db.sale.aggregate({
        where: {
          branchId: branch.id,
          deletedAt: null,
          saleDate: {
            gte: lastWeekStart,
            lt: new Date(lastWeekStart.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        _sum: { total: true },
      });

      const yesterday = Number(yesterdaySales._sum.total) || 0;
      const lastWeek = Number(lastWeekSales._sum.total) || 0;

      // Check if drop is more than 25%
      if (lastWeek > 0 && yesterday < lastWeek * 0.75) {
        const dropPercent = Math.round((1 - yesterday / lastWeek) * 100);

        const existingAlert = await db.alert.findFirst({
          where: {
            branchId: branch.id,
            type: "SALES_DROP",
            status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
            triggeredAt: { gte: todayStart },
          },
        });

        if (existingAlert) continue;

        await db.alert.create({
          data: {
            branchId: branch.id,
            type: "SALES_DROP",
            severity: dropPercent > 50 ? "HIGH" : "MEDIUM",
            title: `Sales Drop: ${dropPercent}% decrease at ${branch.name}`,
            message: `Yesterday's sales (GH₵ ${yesterday.toFixed(2)}) were ${dropPercent}% lower than the same day last week (GH₵ ${lastWeek.toFixed(2)})`,
            status: "ACTIVE",
            triggeredAt: new Date(),
          },
        });

        created++;
      }
    }

    return { created };
  } catch (error) {
    console.error("[checkSalesDrop] Error:", error);
    return { created: 0 };
  }
}

/**
 * Check for staff shortage
 */
export async function checkStaffShortage(): Promise<{ created: number }> {
  try {
    const branches = await db.branch.findMany({
      where: { deletedAt: null, isActive: true },
      include: {
        staff: {
          where: { deletedAt: null, isActive: true },
        },
      },
    });

    let created = 0;

    for (const branch of branches) {
      const totalStaff = branch.staff.length;
      const onDuty = branch.staff.filter((s) => s.dutyStatus === "ON_DUTY").length;
      const required = branch.requiredStaff || 5;

      // Alert if less than 80% of required staff on duty
      if (required > 0 && onDuty < required * 0.8) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAlert = await db.alert.findFirst({
          where: {
            branchId: branch.id,
            type: "STAFF_SHORTAGE",
            status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
            triggeredAt: { gte: today },
          },
        });

        if (existingAlert) continue;

        const shortfall = required - onDuty;

        await db.alert.create({
          data: {
            branchId: branch.id,
            type: "STAFF_SHORTAGE",
            severity: shortfall > 3 ? "HIGH" : "MEDIUM",
            title: `Staff Shortage at ${branch.name}`,
            message: `Only ${onDuty} of ${required} required staff currently on duty. Shortfall: ${shortfall}`,
            status: "ACTIVE",
            triggeredAt: new Date(),
          },
        });

        created++;
      }
    }

    return { created };
  } catch (error) {
    console.error("[checkStaffShortage] Error:", error);
    return { created: 0 };
  }
}

/**
 * Check for waste spikes
 */
export async function checkWasteSpike(): Promise<{ created: number }> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const branches = await db.branch.findMany({
      where: { deletedAt: null, isActive: true },
    });

    let created = 0;

    for (const branch of branches) {
      // Get yesterday's waste
      const yesterdayWaste = await db.wasteLog.aggregate({
        where: {
          branchId: branch.id,
          wasteDate: { gte: yesterdayStart, lt: todayStart },
        },
        _sum: { totalCost: true },
      });

      // Get weekly average
      const weeklyWaste = await db.wasteLog.aggregate({
        where: {
          branchId: branch.id,
          wasteDate: { gte: weekAgo, lt: yesterdayStart },
        },
        _sum: { totalCost: true },
      });

      const yesterday = Number(yesterdayWaste._sum.totalCost) || 0;
      const weeklyAvg = (Number(weeklyWaste._sum.totalCost) || 0) / 6;

      // Alert if waste is more than 2x the average
      if (weeklyAvg > 0 && yesterday > weeklyAvg * 2) {
        const spikePercent = Math.round((yesterday / weeklyAvg - 1) * 100);

        const existingAlert = await db.alert.findFirst({
          where: {
            branchId: branch.id,
            type: "WASTE_SPIKE",
            status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
            triggeredAt: { gte: todayStart },
          },
        });

        if (existingAlert) continue;

        await db.alert.create({
          data: {
            branchId: branch.id,
            type: "WASTE_SPIKE",
            severity: spikePercent > 200 ? "HIGH" : "MEDIUM",
            title: `Waste Spike: ${spikePercent}% above average at ${branch.name}`,
            message: `Yesterday's waste (GH₵ ${yesterday.toFixed(2)}) was ${spikePercent}% higher than the weekly average (GH₵ ${weeklyAvg.toFixed(2)})`,
            status: "ACTIVE",
            triggeredAt: new Date(),
          },
        });

        created++;
      }
    }

    return { created };
  } catch (error) {
    console.error("[checkWasteSpike] Error:", error);
    return { created: 0 };
  }
}

/**
 * Check target progress and create alerts for achieved or missed targets
 */
export async function checkTargetProgress(): Promise<{ created: number }> {
  try {
    const now = new Date();
    
    // Get active targets that have ended
    const endedTargets = await db.target.findMany({
      where: {
        isActive: true,
        periodEnd: { lte: now },
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    let created = 0;

    for (const target of endedTargets) {
      const achieved = Number(target.currentValue) >= Number(target.targetValue);
      const percent = Math.round((Number(target.currentValue) / Number(target.targetValue)) * 100);

      // Check for existing alert
      const existingAlert = await db.alert.findFirst({
        where: {
          branchId: target.branchId,
          type: achieved ? "TARGET_ACHIEVED" : "TARGET_MISSED",
          data: { path: ["targetId"], equals: target.id },
        },
      });

      if (existingAlert) continue;

      await db.alert.create({
        data: {
          branchId: target.branchId,
          type: achieved ? "TARGET_ACHIEVED" : "TARGET_MISSED",
          severity: achieved ? "LOW" : (percent < 50 ? "HIGH" : "MEDIUM"),
          title: achieved
            ? `🎉 Target Achieved: ${target.targetType} at ${target.branch.name}`
            : `Target Missed: ${target.targetType} at ${target.branch.name}`,
          message: achieved
            ? `Congratulations! Achieved ${percent}% of the ${target.period} ${target.targetType} target.`
            : `Reached only ${percent}% of the ${target.period} ${target.targetType} target.`,
          status: "ACTIVE",
          triggeredAt: new Date(),
          data: { targetId: target.id, percent },
        },
      });

      // Mark target as inactive
      await db.target.update({
        where: { id: target.id },
        data: { isActive: false },
      });

      created++;
    }

    return { created };
  } catch (error) {
    console.error("[checkTargetProgress] Error:", error);
    return { created: 0 };
  }
}

/**
 * Send email notifications for critical alerts
 */
export async function sendAlertNotifications(): Promise<{ sent: number }> {
  try {
    // Get active critical/high alerts that haven't been notified
    const alerts = await db.alert.findMany({
      where: {
        status: "ACTIVE",
        severity: { in: ["HIGH", "CRITICAL"] },
        // Only alerts from the last hour
        triggeredAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
      include: {
        branch: { select: { name: true } },
      },
    });

    if (alerts.length === 0) {
      return { sent: 0 };
    }

    // Get users who should receive alerts (CEO and Senior Management)
    const users = await db.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        role: { in: ["CEO", "SENIOR_MANAGEMENT", "BRANCH_MANAGER"] },
      },
      select: { email: true, name: true, role: true, branchId: true },
    });

    let sent = 0;

    for (const alert of alerts) {
      // Filter users based on role and branch
      const recipients = users.filter((user) => {
        if (user.role === "CEO" || user.role === "SENIOR_MANAGEMENT") {
          return true; // Always notify
        }
        // Branch managers only get their branch alerts
        return user.branchId === alert.branchId;
      });

      for (const recipient of recipients) {
        const success = await sendAlertEmail(recipient.email, recipient.name, {
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          branchName: alert.branch?.name,
          actionUrl: `/dashboard/alerts`,
        });

        if (success) sent++;
      }
    }

    return { sent };
  } catch (error) {
    console.error("[sendAlertNotifications] Error:", error);
    return { sent: 0 };
  }
}
