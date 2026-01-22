"use server";

import { db } from "@/lib/db";
import { AuditAction, Prisma } from "@/lib/generated/prisma/client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export interface AuditLogInput {
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  userId?: string; // Optional - will try to get from session if not provided
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(input: AuditLogInput) {
  try {
    let userId = input.userId;
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    // Try to get user from session if not provided
    if (!userId) {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      userId = session?.user?.id;
    }

    // Get request headers
    try {
      const headersList = await headers();
      ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || undefined;
      userAgent = headersList.get("user-agent") || undefined;
    } catch {
      // Headers might not be available in some contexts
    }

    if (!userId) {
      console.warn("[createAuditLog] No user ID available for audit log");
      return { success: false, error: "No user ID available" };
    }

    const auditLog = await db.auditLog.create({
      data: {
        userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldValues: input.oldValues as Prisma.InputJsonValue | undefined,
        newValues: input.newValues as Prisma.InputJsonValue | undefined,
        ipAddress,
        userAgent,
      },
    });

    return { success: true, data: auditLog };
  } catch (error) {
    console.error("[createAuditLog] Error:", error);
    return { success: false, error: "Failed to create audit log" };
  }
}

/**
 * Log a CREATE action
 */
export async function logCreate(
  entityType: string,
  entityId: string,
  newValues: Record<string, unknown>,
  userId?: string
) {
  return createAuditLog({
    action: "CREATE",
    entityType,
    entityId,
    newValues,
    userId,
  });
}

/**
 * Log an UPDATE action
 */
export async function logUpdate(
  entityType: string,
  entityId: string,
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
  userId?: string
) {
  return createAuditLog({
    action: "UPDATE",
    entityType,
    entityId,
    oldValues,
    newValues,
    userId,
  });
}

/**
 * Log a DELETE action
 */
export async function logDelete(
  entityType: string,
  entityId: string,
  oldValues: Record<string, unknown>,
  userId?: string
) {
  return createAuditLog({
    action: "DELETE",
    entityType,
    entityId,
    oldValues,
    userId,
  });
}

/**
 * Log an ADJUSTMENT action (typically for inventory)
 */
export async function logAdjustment(
  entityType: string,
  entityId: string,
  details: Record<string, unknown>,
  userId?: string
) {
  return createAuditLog({
    action: "ADJUSTMENT",
    entityType,
    entityId,
    newValues: details,
    userId,
  });
}

/**
 * Log a TRANSFER action
 */
export async function logTransfer(
  entityType: string,
  entityId: string,
  details: Record<string, unknown>,
  userId?: string
) {
  return createAuditLog({
    action: "TRANSFER",
    entityType,
    entityId,
    newValues: details,
    userId,
  });
}

/**
 * Log a VOID action
 */
export async function logVoid(
  entityType: string,
  entityId: string,
  oldValues: Record<string, unknown>,
  reason?: string,
  userId?: string
) {
  return createAuditLog({
    action: "VOID",
    entityType,
    entityId,
    oldValues,
    newValues: reason ? { voidReason: reason } : undefined,
    userId,
  });
}

/**
 * Get audit logs for an entity
 */
export async function getAuditLogsForEntity(entityType: string, entityId: string) {
  try {
    const logs = await db.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: logs };
  } catch (error) {
    console.error("[getAuditLogsForEntity] Error:", error);
    return { success: false, error: "Failed to fetch audit logs", data: [] };
  }
}

/**
 * Get recent audit logs
 */
export async function getRecentAuditLogs(
  limit: number = 50,
  filters?: {
    userId?: string;
    entityType?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
  }
) {
  try {
    const logs = await db.auditLog.findMany({
      where: {
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.entityType && { entityType: filters.entityType }),
        ...(filters?.action && { action: filters.action }),
        ...(filters?.startDate || filters?.endDate
          ? {
              createdAt: {
                ...(filters.startDate && { gte: filters.startDate }),
                ...(filters.endDate && { lte: filters.endDate }),
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return { success: true, data: logs };
  } catch (error) {
    console.error("[getRecentAuditLogs] Error:", error);
    return { success: false, error: "Failed to fetch audit logs", data: [] };
  }
}

/**
 * Get audit logs for a user
 */
export async function getAuditLogsByUser(userId: string, limit: number = 50) {
  try {
    const logs = await db.auditLog.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return { success: true, data: logs };
  } catch (error) {
    console.error("[getAuditLogsByUser] Error:", error);
    return { success: false, error: "Failed to fetch audit logs", data: [] };
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(startDate?: Date, endDate?: Date) {
  try {
    const dateFilter = startDate || endDate
      ? {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        }
      : {};

    const [totalLogs, byAction, byEntityType, byUser] = await Promise.all([
      db.auditLog.count({ where: dateFilter }),
      db.auditLog.groupBy({
        by: ["action"],
        where: dateFilter,
        _count: true,
      }),
      db.auditLog.groupBy({
        by: ["entityType"],
        where: dateFilter,
        _count: true,
        orderBy: { _count: { entityType: "desc" } },
        take: 10,
      }),
      db.auditLog.groupBy({
        by: ["userId"],
        where: dateFilter,
        _count: true,
        orderBy: { _count: { userId: "desc" } },
        take: 10,
      }),
    ]);

    // Get user names for top users
    const userIds = byUser.map((u) => u.userId);
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return {
      success: true,
      data: {
        totalLogs,
        byAction: byAction.map((a) => ({
          action: a.action,
          count: a._count,
        })),
        byEntityType: byEntityType.map((e) => ({
          entityType: e.entityType,
          count: e._count,
        })),
        byUser: byUser.map((u) => ({
          userId: u.userId,
          userName: userMap.get(u.userId) || "Unknown",
          count: u._count,
        })),
      },
    };
  } catch (error) {
    console.error("[getAuditLogStats] Error:", error);
    return { success: false, error: "Failed to fetch audit stats" };
  }
}
