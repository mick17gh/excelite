"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export interface CreateTargetInput {
  branchId: string;
  targetType: string; // "REVENUE", "TRANSACTIONS", "AVERAGE_TICKET", etc.
  period: string; // "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"
  periodStart: Date;
  periodEnd: Date;
  targetValue: number;
}

export interface UpdateTargetInput {
  id: string;
  targetValue?: number;
  isActive?: boolean;
  periodStart?: Date;
  periodEnd?: Date;
}

export async function createTarget(input: CreateTargetInput) {
  try {
    const session = await auth.api.getSession({
      headers: {
        cookie: (await (await import('next/headers')).cookies()).toString()
      }
    });
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    const target = await db.target.create({
      data: {
        branchId: input.branchId,
        targetType: input.targetType,
        period: input.period,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        targetValue: input.targetValue,
        currentValue: 0,
        isActive: true,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    revalidatePath("/dashboard/branches");
    revalidatePath("/dashboard/targets");
    return { 
      success: true, 
      data: {
        ...target,
        targetValue: Number(target.targetValue),
        currentValue: Number(target.currentValue)
      }
    };
  } catch (error) {
    console.error("[createTarget] Error:", error);
    return { success: false, error: "Failed to create target" };
  }
}

export async function updateTarget(input: UpdateTargetInput) {
  try {
    const session = await auth.api.getSession({
      headers: {
        cookie: (await (await import('next/headers')).cookies()).toString()
      }
    });
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    const updateData: {
      targetValue?: number;
      isActive?: boolean;
      periodStart?: Date;
      periodEnd?: Date;
    } = {};
    if (input.targetValue !== undefined) updateData.targetValue = input.targetValue;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.periodStart) updateData.periodStart = input.periodStart;
    if (input.periodEnd) updateData.periodEnd = input.periodEnd;

    const target = await db.target.update({
      where: { id: input.id },
      data: updateData,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    revalidatePath("/dashboard/branches");
    revalidatePath("/dashboard/targets");
    return { 
      success: true, 
      data: {
        ...target,
        targetValue: Number(target.targetValue),
        currentValue: Number(target.currentValue)
      }
    };
  } catch (error) {
    console.error("[updateTarget] Error:", error);
    return { success: false, error: "Failed to update target" };
  }
}

export async function deleteTarget(id: string) {
  try {
    const session = await auth.api.getSession({
      headers: {
        cookie: (await (await import('next/headers')).cookies()).toString()
      }
    });
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    await db.target.delete({
      where: { id },
    });

    revalidatePath("/dashboard/branches");
    revalidatePath("/dashboard/targets");
    return { success: true };
  } catch (error) {
    console.error("[deleteTarget] Error:", error);
    return { success: false, error: "Failed to delete target" };
  }
}

export async function getTargets(branchId?: string, targetType?: string) {
  try {
    const targets = await db.target.findMany({
      where: {
        ...(branchId && { branchId }),
        ...(targetType && { targetType }),
        isActive: true,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [
        { periodStart: "desc" },
        { targetType: "asc" },
      ],
    });

    return {
      success: true,
      data: targets.map((t) => ({
        ...t,
        targetValue: Number(t.targetValue),
        currentValue: Number(t.currentValue),
      })),
    };
  } catch (error) {
    console.error("[getTargets] Error:", error);
    return { success: false, error: "Failed to fetch targets", data: [] };
  }
}

export async function getTargetById(id: string) {
  try {
    const target = await db.target.findUnique({
      where: { id },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!target) {
      return { success: false, error: "Target not found" };
    }

    return {
      success: true,
      data: {
        ...target,
        targetValue: Number(target.targetValue),
        currentValue: Number(target.currentValue),
      },
    };
  } catch (error) {
    console.error("[getTargetById] Error:", error);
    return { success: false, error: "Failed to fetch target" };
  }
}
