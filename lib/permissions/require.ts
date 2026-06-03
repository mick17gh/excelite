import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/lib/generated/prisma/client";
import {
  getEffectivePermissions,
  hasPermissionInList,
} from "@/lib/permissions/resolver";
import type { Permission } from "@/lib/permissions/types";

export type PermissionContext = {
  user: { id: string; role: Role; organizationId: string | null };
  organizationId: string;
  permissions: Permission[];
};

export async function resolveOrganizationIdForSession(
  userId: string,
): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  if (user?.organizationId) return user.organizationId;
  const org = await db.organization.findFirst({ select: { id: true } });
  return org?.id ?? null;
}

export async function getPermissionContext(): Promise<PermissionContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;

  const role = (session.user.role as Role) || "STAFF";
  const organizationId = await resolveOrganizationIdForSession(session.user.id);
  if (!organizationId) return null;

  const permissions = await getEffectivePermissions(organizationId, role);
  return {
    user: {
      id: session.user.id,
      role,
      organizationId,
    },
    organizationId,
    permissions,
  };
}

export async function requirePermission(
  permission: Permission,
): Promise<
  | { ok: true; ctx: PermissionContext }
  | { ok: false; error: string }
> {
  const ctx = await getPermissionContext();
  if (!ctx) {
    return { ok: false, error: "Unauthorized" };
  }
  if (!hasPermissionInList(ctx.permissions, permission)) {
    return { ok: false, error: "You do not have permission to perform this action" };
  }
  return { ok: true, ctx };
}

/** Role permission matrix (Settings → Permissions) is Super Admin only. */
export function canManageRoleMatrix(role: Role): boolean {
  return role === "SUPER_ADMIN";
}

export async function actorHasPermission(permission: Permission): Promise<boolean> {
  const ctx = await getPermissionContext();
  if (!ctx) return false;
  return hasPermissionInList(ctx.permissions, permission);
}
