"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import { clearPermissionsMemo, getEffectivePermissions } from "@/lib/permissions/resolver";
import {
  canManageRoleMatrix,
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

function lockAdminSelfPermissions(
  actorRole: Role,
  targetRole: Role,
  permissions: Permission[],
): Permission[] {
  if (actorRole !== "ADMIN" || targetRole !== "ADMIN") {
    return permissions;
  }
  const locked = new Set(permissions);
  locked.add("roles:view");
  locked.add("roles:manage");
  locked.add("users:view");
  locked.add("users:edit");
  return [...locked];
}

export async function getOrgRolePermissionMatrix(role: Role) {
  const auth = await requirePermission("roles:view");
  if (!auth.ok) return { success: false as const, error: auth.error };

  if (!canManageRoleMatrix(auth.ctx.user.role)) {
    return { success: false as const, error: "Only administrators can manage role permissions" };
  }

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
  const auth = await requirePermission("roles:manage");
  if (!auth.ok) return { success: false as const, error: auth.error };

  if (!canManageRoleMatrix(auth.ctx.user.role)) {
    return { success: false as const, error: "Only administrators can manage role permissions" };
  }

  if (input.role === "SUPER_ADMIN") {
    return { success: false as const, error: "Super Admin permissions cannot be changed" };
  }

  if (!EDITABLE_MATRIX_ROLES.includes(input.role as (typeof EDITABLE_MATRIX_ROLES)[number])) {
    return { success: false as const, error: "Invalid role" };
  }

  let permissions = sanitizePermissionsForActor(auth.ctx.user.role, input.permissions);
  permissions = lockAdminSelfPermissions(
    auth.ctx.user.role,
    input.role,
    permissions,
  );

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
  const auth = await requirePermission("roles:manage");
  if (!auth.ok) return { success: false as const, error: auth.error };

  if (!canManageRoleMatrix(auth.ctx.user.role)) {
    return { success: false as const, error: "Only administrators can manage role permissions" };
  }

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
