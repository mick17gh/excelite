"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface CreateBranchInput {
  name: string;
  code: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  currency: string;
  phone?: string;
  email?: string;
  timezone: string;
  openingDate?: Date;
  isActive: boolean;
}

export interface UpdateBranchInput {
  id: string;
  name?: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  currency?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  isActive?: boolean;
}

export async function createBranch(input: CreateBranchInput) {
  try {
    const branch = await db.branch.create({
      data: {
        name: input.name,
        code: input.code,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country,
        currency: input.currency,
        phone: input.phone,
        email: input.email,
        timezone: input.timezone,
        openingDate: input.openingDate,
        isActive: input.isActive,
      },
    });

    revalidatePath("/dashboard/branches");
    return { success: true, data: branch };
  } catch (error) {
    console.error("[createBranch] Error:", error);
    return { success: false, error: "Failed to create branch" };
  }
}

export async function updateBranch(input: UpdateBranchInput) {
  try {
    const { id, ...data } = input;
    const branch = await db.branch.update({
      where: { id },
      data,
    });

    revalidatePath("/dashboard/branches");
    return { success: true, data: branch };
  } catch (error) {
    console.error("[updateBranch] Error:", error);
    return { success: false, error: "Failed to update branch" };
  }
}

export async function deleteBranch(id: string) {
  try {
    await db.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/dashboard/branches");
    return { success: true };
  } catch (error) {
    console.error("[deleteBranch] Error:", error);
    return { success: false, error: "Failed to delete branch" };
  }
}

export async function getBranches() {
  try {
    const branches = await db.branch.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    return { success: true, data: branches };
  } catch (error) {
    console.error("[getBranches] Error:", error);
    return { success: false, error: "Failed to fetch branches", data: [] };
  }
}

export async function getBranchById(id: string) {
  try {
    const branch = await db.branch.findUnique({
      where: { id },
      include: {
        users: true,
        staff: true,
      },
    });
    return { success: true, data: branch };
  } catch (error) {
    console.error("[getBranchById] Error:", error);
    return { success: false, error: "Failed to fetch branch" };
  }
}

export async function getBranchPerformance(startDate?: Date, endDate?: Date) {
  try {
    const effectiveStartDate = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
    const effectiveEndDate = endDate || new Date();
    
    const branches = await db.branch.findMany({
      where: { deletedAt: null, isActive: true },
      include: {
        sales: {
          where: {
            deletedAt: null,
            saleDate: {
              gte: effectiveStartDate,
              lte: effectiveEndDate,
            },
          },
        },
        wasteLogs: {
          where: {
            wasteDate: {
              gte: effectiveStartDate,
              lte: effectiveEndDate,
            },
          },
        },
        targets: {
          where: {
            isActive: true,
            targetType: "REVENUE",
          },
        },
      },
    });

    const performance = branches.map((branch) => {
      const revenue = branch.sales.reduce(
        (sum, sale) => sum + Number(sale.total),
        0
      );
      const transactions = branch.sales.length;
      const waste = branch.wasteLogs.reduce(
        (sum, log) => sum + Number(log.totalCost),
        0
      );
      const target = branch.targets[0]?.targetValue
        ? Number(branch.targets[0].targetValue)
        : 100000;
      const performancePercent = target > 0 ? (revenue / target) * 100 : 0;

      let status: "good" | "warning" | "critical" = "good";
      if (performancePercent < 80) status = "critical";
      else if (performancePercent < 95) status = "warning";

      return {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        revenue,
        target,
        performance: performancePercent,
        transactions,
        waste,
        status,
      };
    });

    return { success: true, data: performance };
  } catch (error) {
    console.error("[getBranchPerformance] Error:", error);
    return { success: false, error: "Failed to fetch branch performance", data: [] };
  }
}

export interface SetTargetInput {
  branchId: string;
  targetType: string;
  period: string;
  targetValue: number;
  notes?: string;
}

export async function setTarget(input: SetTargetInput) {
  try {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    switch (input.period) {
      case "DAILY":
        periodStart = new Date(now.setHours(0, 0, 0, 0));
        periodEnd = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "WEEKLY":
        const dayOfWeek = now.getDay();
        periodStart = new Date(now.setDate(now.getDate() - dayOfWeek));
        periodEnd = new Date(now.setDate(now.getDate() + 6));
        break;
      case "MONTHLY":
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "QUARTERLY":
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), quarter * 3, 1);
        periodEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case "YEARLY":
        periodStart = new Date(now.getFullYear(), 0, 1);
        periodEnd = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const target = await db.target.create({
      data: {
        branchId: input.branchId,
        targetType: input.targetType,
        period: input.period,
        periodStart,
        periodEnd,
        targetValue: input.targetValue,
        isActive: true,
      },
    });

    revalidatePath("/dashboard/branches");
    return { success: true, data: target };
  } catch (error) {
    console.error("[setTarget] Error:", error);
    return { success: false, error: "Failed to set target" };
  }
}
