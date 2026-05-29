"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { hasFeature, isSuperAdmin, isWithinLimit } from "@/lib/tier-config";
import type { Role } from "@/lib/generated/prisma/client";

async function resolveActorOrganizationId(user: {
  organizationId: string | null;
  branchId: string | null;
}): Promise<string | null> {
  if (user.organizationId) {
    return user.organizationId;
  }
  if (!user.branchId) {
    return null;
  }
  const homeBranch = await db.branch.findUnique({
    where: { id: user.branchId },
    select: { organizationId: true },
  });
  return homeBranch?.organizationId ?? null;
}

async function getBranchActor() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return { ok: false as const, error: "Not authenticated" };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, organizationId: true, branchId: true },
  });
  if (!user) {
    return { ok: false as const, error: "User not found" };
  }

  const organizationId = await resolveActorOrganizationId(user);

  return {
    ok: true as const,
    userId: user.id,
    role: user.role as Role,
    organizationId,
  };
}

async function assertCanAssignOrganization(
  organizationId: string | null,
  role: Role,
  options?: { countAsNewBranch?: boolean }
): Promise<{ ok: true; organizationId: string | null } | { ok: false; error: string }> {
  if (!organizationId) {
    return { ok: true, organizationId: null };
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, tier: true, maxBranches: true },
  });
  if (!org) {
    return { ok: false, error: "Organization not found" };
  }

  if (options?.countAsNewBranch !== false) {
    const branchCount = await db.branch.count({
      where: { organizationId, deletedAt: null },
    });

    const withinTier = isWithinLimit(org.tier, "branches", branchCount, role);
    const withinOrgCap = branchCount < org.maxBranches;

    if (!withinTier && !isSuperAdmin(role)) {
      return {
        ok: false,
        error: "Branch limit reached for your subscription tier. Upgrade to add more branches.",
      };
    }
    if (!withinOrgCap && !isSuperAdmin(role)) {
      return {
        ok: false,
        error: `Your organization allows up to ${org.maxBranches} branch(es).`,
      };
    }
  }

  return { ok: true, organizationId };
}

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
  requiredStaff?: number;
  isActive: boolean;
  onlineStoreVisible?: boolean;
  blockSalesWhenOutOfStock?: boolean | null;
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
  requiredStaff?: number;
  isActive?: boolean;
  onlineStoreVisible?: boolean;
  /** null = inherit org setting */
  blockSalesWhenOutOfStock?: boolean | null;
}

export async function createBranch(input: CreateBranchInput) {
  try {
    const actor = await getBranchActor();
    if (!actor.ok) {
      return { success: false, error: actor.error };
    }

    // Input validation
    if (!input.name?.trim()) {
      return { success: false, error: "Branch name is required" };
    }
    if (!input.code?.trim()) {
      return { success: false, error: "Branch code is required" };
    }
    if (!input.address?.trim()) {
      return { success: false, error: "Branch address is required" };
    }
    if (!input.city?.trim()) {
      return { success: false, error: "City is required" };
    }
    if (input.requiredStaff && input.requiredStaff < 1) {
      return { success: false, error: "Required staff must be at least 1" };
    }

    const orgCheck = await assertCanAssignOrganization(actor.organizationId, actor.role, {
      countAsNewBranch: true,
    });
    if (!orgCheck.ok) {
      return { success: false, error: orgCheck.error };
    }

    const branch = await db.branch.create({
      data: {
        name: input.name.trim(),
        code: input.code.trim().toUpperCase(),
        address: input.address.trim(),
        city: input.city.trim(),
        state: input.state?.trim(),
        country: input.country?.trim() || "GH",
        currency: input.currency?.trim() || "GHS",
        timezone: input.timezone?.trim() || "Africa/Accra",
        phone: input.phone?.trim(),
        email: input.email?.trim(),
        openingDate: input.openingDate,
        requiredStaff: input.requiredStaff || 5,
        isActive: input.isActive ?? true,
        onlineStoreVisible:
          (input.isActive ?? true) === false ? false : (input.onlineStoreVisible ?? false),
        organizationId: orgCheck.organizationId,
      },
    });

    revalidatePath("/dashboard/branches");
    revalidatePath(`/dashboard/branches/${branch.id}`);
    return {
      success: true,
      data: {
        ...JSON.parse(JSON.stringify(branch)),
        taxRate: branch.taxRate ? Number(branch.taxRate) : 0,
        latitude: branch.latitude ? Number(branch.latitude) : null,
        longitude: branch.longitude ? Number(branch.longitude) : null,
      },
    };
  } catch (error) {
    console.error("[createBranch] Error:", error);
    return { success: false, error: "Failed to create branch" };
  }
}

export async function updateBranch(input: UpdateBranchInput) {
  try {
    const actor = await getBranchActor();
    if (!actor.ok) {
      return { success: false, error: actor.error };
    }

    const existing = await db.branch.findUnique({
      where: { id: input.id },
      select: { id: true, organizationId: true },
    });
    if (!existing) {
      return { success: false, error: "Branch not found" };
    }

    if (
      existing.organizationId &&
      actor.organizationId &&
      existing.organizationId !== actor.organizationId &&
      !isSuperAdmin(actor.role)
    ) {
      return { success: false, error: "You do not have access to update this branch" };
    }

    const { id, ...rest } = input;
    const data: typeof rest & { organizationId?: string | null } = { ...rest };

    if (data.isActive === false) {
      data.onlineStoreVisible = false;
    }

    let organizationLinked = false;
    const shouldLinkOrganization =
      !existing.organizationId && Boolean(actor.organizationId);

    if (shouldLinkOrganization) {
      const orgCheck = await assertCanAssignOrganization(actor.organizationId, actor.role, {
        countAsNewBranch: false,
      });
      if (!orgCheck.ok) {
        return { success: false, error: orgCheck.error };
      }
      data.organizationId = orgCheck.organizationId;
      organizationLinked = true;
    }

    const branch = await db.branch.update({
      where: { id },
      data,
    });

    // Branch name/code changes are consumed across multiple route segments.
    // Revalidate all pages that render branch selectors/labels from server data.
    revalidatePath("/dashboard/branches");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/reports");
    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard/targets");
    revalidatePath("/dashboard/warehouse");
    revalidatePath("/pos");
    revalidatePath("/kitchen");
    revalidatePath(`/dashboard/branches/${id}`);
    return {
      success: true,
      data: {
        ...JSON.parse(JSON.stringify(branch)),
        taxRate: branch.taxRate ? Number(branch.taxRate) : 0,
        latitude: branch.latitude ? Number(branch.latitude) : null,
        longitude: branch.longitude ? Number(branch.longitude) : null,
        organizationLinked,
      },
    };
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
    // Force plain-object serialization to strip Prisma Decimal wrappers
    const serializedBranches = branches.map(branch => {
      const plain = JSON.parse(JSON.stringify(branch));
      return {
        ...plain,
        taxRate: branch.taxRate ? Number(branch.taxRate) : 0,
        latitude: branch.latitude ? Number(branch.latitude) : null,
        longitude: branch.longitude ? Number(branch.longitude) : null,
      };
    });
    return { success: true, data: serializedBranches };
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

    if (!branch) {
      return { success: false, error: "Branch not found" };
    }

    // Force plain-object serialization to strip Prisma Decimal wrappers
    const convertedBranch = {
      ...JSON.parse(JSON.stringify(branch)),
      taxRate: parseFloat(String(branch.taxRate)),
      latitude: branch.latitude != null ? parseFloat(String(branch.latitude)) : null,
      longitude: branch.longitude != null ? parseFloat(String(branch.longitude)) : null,
      staff: branch.staff.map(s => ({
        ...JSON.parse(JSON.stringify(s)),
        hourlyRate: parseFloat(String(s.hourlyRate)),
      })),
      users: branch.users.map(u => JSON.parse(JSON.stringify(u))),
    };

    return { success: true, data: convertedBranch };
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
        : 0;
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
    return { 
      success: true, 
      data: {
        ...target,
        targetValue: Number(target.targetValue)
      }
    };
  } catch (error) {
    console.error("[setTarget] Error:", error);
    return { success: false, error: "Failed to set target" };
  }
}

export async function getBranchOnlineStoreEditContext(branchId: string) {
  try {
    const actor = await getBranchActor();
    if (!actor.ok) {
      return { data: { showOnlineStoreToggle: false, onlineStoreVisible: false } };
    }

    const branch = await db.branch.findUnique({
      where: { id: branchId },
      select: { organizationId: true, onlineStoreVisible: true },
    });
    if (!branch) {
      return { data: { showOnlineStoreToggle: false, onlineStoreVisible: false } };
    }

    const organizationId = branch.organizationId ?? actor.organizationId;
    if (!organizationId) {
      return { data: { showOnlineStoreToggle: false, onlineStoreVisible: false } };
    }

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { tier: true, onlineOrderingEnabled: true },
    });
    if (!org) {
      return { data: { showOnlineStoreToggle: false, onlineStoreVisible: false } };
    }

    const showOnlineStoreToggle =
      hasFeature(org.tier, "onlineOrdering") && org.onlineOrderingEnabled;

    return {
      data: {
        showOnlineStoreToggle,
        onlineStoreVisible: branch.onlineStoreVisible,
      },
    };
  } catch (error) {
    console.error("[getBranchOnlineStoreEditContext] Error:", error);
    return { data: { showOnlineStoreToggle: false, onlineStoreVisible: false } };
  }
}
