import "server-only";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Role, SubscriptionTier } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import { isTableManagementEnabled } from "@/lib/features/table-management";
import { hasPermissionInList } from "@/lib/permissions/check-list";
import { resolveOrganizationIdForSession } from "@/lib/permissions/require";
import { getEffectivePermissions } from "@/lib/permissions/resolver";
import type { RouteAccessContext } from "@/lib/permissions/routes";
import { getPermissionsForRole } from "@/lib/permissions/sync";
import type { Permission } from "@/lib/permissions/types";

export type SessionAccess = {
  userId: string;
  role: Role;
  organizationId: string;
  permissions: Permission[];
  accessCtx: RouteAccessContext;
};

export type SessionAccessResult =
  | { kind: "unauthenticated" }
  | { kind: "onboarding" }
  | { kind: "ready"; access: SessionAccess };

export async function resolveSessionAccess(): Promise<SessionAccessResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { kind: "unauthenticated" };

  const role = (session.user.role as Role) || "STAFF";
  const organizationId = await resolveOrganizationIdForSession(session.user.id);
  if (!organizationId) return { kind: "onboarding" };

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, tier: true },
  });
  if (!org) return { kind: "onboarding" };

  let permissions: Permission[];
  try {
    permissions = await getEffectivePermissions(org.id, role);
  } catch {
    permissions = getPermissionsForRole(role);
  }

  const tableManagementEnabled = await isTableManagementEnabled(org.id);
  const orgTier = org.tier as SubscriptionTier;

  return {
    kind: "ready",
    access: {
      userId: session.user.id,
      role,
      organizationId: org.id,
      permissions,
      accessCtx: {
        permissions,
        orgTier,
        tableManagementEnabled,
        role,
      },
    },
  };
}

export async function loadSessionAccess(): Promise<SessionAccess | null> {
  const result = await resolveSessionAccess();
  return result.kind === "ready" ? result.access : null;
}

export async function requireSessionAccess(): Promise<SessionAccess> {
  const result = await resolveSessionAccess();
  if (result.kind === "unauthenticated") {
    redirect("/login");
  }
  if (result.kind === "onboarding") {
    redirect("/onboarding");
  }
  return result.access;
}

export function sessionHasPermission(access: SessionAccess, permission: Permission): boolean {
  return hasPermissionInList(access.permissions, permission);
}
