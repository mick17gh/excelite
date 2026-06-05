"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Permission } from "@/lib/permissions/types";
import { getEffectivePermissions, hasPermissionInList } from "@/lib/permissions/resolver";
import { resolveOrganizationIdForSession } from "@/lib/permissions/require";
import type { Role, ShiftTemplate, StaffJobRoleCategory } from "@/lib/generated/prisma/client";
import { ensureDefaultStaffJobRoles } from "@/lib/staff/job-role-seed";

type JobRoleActor = {
  userId: string;
  role: Role;
  organizationId: string;
  permissions: Permission[];
};

function actorCan(actor: JobRoleActor, permission: Permission) {
  return hasPermissionInList(actor.permissions, permission);
}

async function getActor(): Promise<JobRoleActor | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;
  const organizationId = await resolveOrganizationIdForSession(session.user.id);
  if (!organizationId) return null;
  const role = session.user.role as Role;
  const permissions = await getEffectivePermissions(organizationId, role);
  return { userId: session.user.id, role, organizationId, permissions };
}

export async function listStaffJobRoles(options?: {
  organizationId?: string;
  activeOnly?: boolean;
}) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "staff:view")) {
    return { success: false, error: "Forbidden", data: [] };
  }

  const orgId = options?.organizationId ?? actor.organizationId;
  await ensureDefaultStaffJobRoles(orgId);

  const rows = await db.staffJobRole.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      ...(options?.activeOnly ? { isActive: true } : {}),
    },
    include: {
      _count: { select: { staff: { where: { deletedAt: null } } } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return {
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      category: r.category,
      description: r.description,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
      defaultShiftTemplate: r.defaultShiftTemplate,
      staffCount: r._count.staff,
    })),
  };
}

export async function createStaffJobRole(input: {
  name: string;
  code: string;
  category?: StaffJobRoleCategory | null;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  defaultShiftTemplate?: ShiftTemplate | null;
}) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "staff:edit")) {
    return { success: false, error: "Forbidden" };
  }

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase().replace(/\s+/g, "_");
  if (!name || !code) {
    return { success: false, error: "Name and code are required" };
  }

  await db.staffJobRole.create({
    data: {
      organizationId: actor.organizationId,
      name,
      code,
      category: input.category ?? null,
      description: input.description?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      defaultShiftTemplate: input.defaultShiftTemplate ?? null,
    },
  });

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateStaffJobRole(input: {
  id: string;
  name?: string;
  code?: string;
  category?: StaffJobRoleCategory | null;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  defaultShiftTemplate?: ShiftTemplate | null;
}) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "staff:edit")) {
    return { success: false, error: "Forbidden" };
  }

  const existing = await db.staffJobRole.findFirst({
    where: { id: input.id, organizationId: actor.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Job role not found" };

  await db.staffJobRole.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.code !== undefined
        ? { code: input.code.trim().toUpperCase().replace(/\s+/g, "_") }
        : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.defaultShiftTemplate !== undefined
        ? { defaultShiftTemplate: input.defaultShiftTemplate }
        : {}),
    },
  });

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function archiveStaffJobRole(id: string) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "staff:edit")) {
    return { success: false, error: "Forbidden" };
  }

  const existing = await db.staffJobRole.findFirst({
    where: { id, organizationId: actor.organizationId, deletedAt: null },
    include: { _count: { select: { staff: { where: { deletedAt: null } } } } },
  });
  if (!existing) return { success: false, error: "Job role not found" };

  if (existing._count.staff > 0) {
    await db.staffJobRole.update({
      where: { id },
      data: { isActive: false },
    });
  } else {
    await db.staffJobRole.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function restoreStaffJobRole(id: string) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "staff:edit")) {
    return { success: false, error: "Forbidden" };
  }

  await db.staffJobRole.updateMany({
    where: { id, organizationId: actor.organizationId },
    data: { isActive: true, deletedAt: null },
  });

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/settings");
  return { success: true };
}
