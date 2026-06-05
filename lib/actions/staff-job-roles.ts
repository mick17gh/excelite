"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Permission } from "@/lib/permissions/types";
import { getEffectivePermissions, hasPermissionInList } from "@/lib/permissions/resolver";
import { resolveOrganizationIdForSession } from "@/lib/permissions/require";
import {
  Prisma,
  type Role,
  type ShiftTemplate,
  type StaffJobRoleCategory,
} from "@/lib/generated/prisma/client";
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
  try {
    await ensureDefaultStaffJobRoles(orgId);
  } catch (error) {
    console.error("ensureDefaultStaffJobRoles failed:", error);
  }

  const rows = await db.staffJobRole.findMany({
    where: {
      organizationId: orgId,
      ...(options?.activeOnly ? { deletedAt: null, isActive: true } : {}),
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
      isActive: r.deletedAt ? false : r.isActive,
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

  const duplicate = await db.staffJobRole.findFirst({
    where: {
      organizationId: actor.organizationId,
      OR: [{ code }, { name }],
    },
    include: { _count: { select: { staff: { where: { deletedAt: null } } } } },
  });

  if (duplicate) {
    const canReuse =
      duplicate.deletedAt !== null && duplicate._count.staff === 0;

    if (canReuse) {
      await db.staffJobRole.update({
        where: { id: duplicate.id },
        data: {
          name,
          code,
          category: input.category ?? null,
          description: input.description?.trim() || null,
          sortOrder: input.sortOrder ?? 0,
          isActive: input.isActive ?? true,
          defaultShiftTemplate: input.defaultShiftTemplate ?? null,
          deletedAt: null,
        },
      });
      revalidatePath("/dashboard/staff");
      revalidatePath("/dashboard/settings");
      return { success: true };
    }

    const field = duplicate.code === code ? "code" : "name";
    const isArchived = duplicate.deletedAt !== null || !duplicate.isActive;
    const hint = isArchived ? " Restore it from the Archived list instead." : "";
    return {
      success: false,
      error: `A job role with this ${field} already exists.${hint}`,
    };
  }

  try {
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "A job role with this code or name already exists." };
    }
    throw error;
  }

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

  await db.staffJobRole.update({
    where: { id },
    data: { isActive: false, deletedAt: null },
  });

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
