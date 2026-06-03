"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import { clearPermissionsMemo, getEffectivePermissions } from "@/lib/permissions/resolver";
import {
  canManageRoleMatrix,
  getPermissionContext,
  requirePermission,
} from "@/lib/permissions/require";
import {
  getDefaultPermissionsForRole,
  replaceRolePermissions,
  seedOrgRolePermissions,
} from "@/lib/permissions/seed";
import {
  ALL_PERMISSIONS,
  EDITABLE_MATRIX_ROLES,
  PLATFORM_ONLY_PERMISSIONS,
  type Permission,
} from "@/lib/permissions/types";
import { createAuditLog } from "@/lib/services/audit";

function sanitizePermissionsForActor(
  actorRole: Role,
  permissions: Permission[],
): Permission[] {
  const valid = new Set(ALL_PERMISSIONS);
  let filtered = permissions.filter((p) => valid.has(p));

  if (actorRole !== "SUPER_ADMIN") {
    filtered = filtered.filter((p) => !PLATFORM_ONLY_PERMISSIONS.includes(p));
  }

  return [...new Set(filtered)];
}

export async function getOrgRolePermissionMatrix(role: Role) {
  const ctx = await getPermissionContext();
  if (!ctx) return { success: false as const, error: "Unauthorized" };
  if (!canManageRoleMatrix(ctx.user.role)) {
    return { success: false as const, error: "Only Super Admin can manage role permissions" };
  }
  const auth = { ok: true as const, ctx };

  if (role === "SUPER_ADMIN") {
    return {
      success: true as const,
      data: {
        role,
        permissions: ALL_PERMISSIONS,
        readOnly: true,
        source: "code" as const,
      },
    };
  }

  if (!EDITABLE_MATRIX_ROLES.includes(role as (typeof EDITABLE_MATRIX_ROLES)[number])) {
    return { success: false as const, error: "Invalid role" };
  }

  const { organizationId } = auth.ctx;
  const permissions = await getEffectivePermissions(organizationId, role);

  const rowCount = await db.orgRolePermission.count({
    where: { organizationId, role },
  });

  return {
    success: true as const,
    data: {
      role,
      permissions,
      readOnly: false,
      source: rowCount > 0 ? ("database" as const) : ("defaults" as const),
    },
  };
}

export async function updateOrgRolePermissions(input: {
  role: Role;
  permissions: Permission[];
}) {
  const ctx = await getPermissionContext();
  if (!ctx) return { success: false as const, error: "Unauthorized" };
  if (!canManageRoleMatrix(ctx.user.role)) {
    return { success: false as const, error: "Only Super Admin can manage role permissions" };
  }
  const auth = { ok: true as const, ctx };

  if (input.role === "SUPER_ADMIN") {
    return { success: false as const, error: "Super Admin permissions cannot be changed" };
  }

  if (!EDITABLE_MATRIX_ROLES.includes(input.role as (typeof EDITABLE_MATRIX_ROLES)[number])) {
    return { success: false as const, error: "Invalid role" };
  }

  const permissions = sanitizePermissionsForActor(auth.ctx.user.role, input.permissions);

  await replaceRolePermissions(db, auth.ctx.organizationId, input.role, permissions);
  clearPermissionsMemo();

  await createAuditLog({
    action: "UPDATE",
    entityType: "OrgRolePermission",
    entityId: `${auth.ctx.organizationId}:${input.role}`,
    userId: auth.ctx.user.id,
    newValues: {
      role: input.role,
      permissionCount: permissions.length,
    },
  });

  revalidatePermissionLayouts();

  return { success: true as const, data: { permissions } };
}

export async function resetRolePermissionsToDefaults(role: Role) {
  const ctx = await getPermissionContext();
  if (!ctx) return { success: false as const, error: "Unauthorized" };
  if (!canManageRoleMatrix(ctx.user.role)) {
    return { success: false as const, error: "Only Super Admin can manage role permissions" };
  }
  const auth = { ok: true as const, ctx };

  if (role === "SUPER_ADMIN") {
    return { success: false as const, error: "Super Admin permissions cannot be reset" };
  }

  if (!EDITABLE_MATRIX_ROLES.includes(role as (typeof EDITABLE_MATRIX_ROLES)[number])) {
    return { success: false as const, error: "Invalid role" };
  }

  const permissions = getDefaultPermissionsForRole(role);
  await replaceRolePermissions(db, auth.ctx.organizationId, role, permissions);
  clearPermissionsMemo();

  revalidatePermissionLayouts();

  return { success: true as const, data: { permissions } };
}

function revalidatePermissionLayouts() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings", "layout");
  revalidatePath("/dashboard/account", "layout");
  revalidatePath("/pos", "layout");
  revalidatePath("/kitchen", "layout");
}

/** Idempotent seed for an org (onboarding / repair). */
export async function seedOrganizationRolePermissions(organizationId: string) {
  const auth = await requirePermission("roles:manage");
  if (!auth.ok) return { success: false as const, error: auth.error };
  if (auth.ctx.organizationId !== organizationId) {
    return { success: false as const, error: "Organization mismatch" };
  }
  await seedOrgRolePermissions(db, organizationId);
  clearPermissionsMemo();
  return { success: true as const };
}
