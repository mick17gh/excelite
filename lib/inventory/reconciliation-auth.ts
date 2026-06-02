import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getEffectivePermissions, hasPermissionInList } from "@/lib/permissions/resolver";
import type { Permission } from "@/lib/permissions/types";
import { resolveOrganizationIdForSession } from "@/lib/permissions/require";
import { Role } from "@/lib/generated/prisma/client";

export interface ReconciliationViewer {
  userId: string;
  role: Role;
  branchId: string | null;
  name: string | null;
}

const ORG_WIDE_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.EXECUTIVE,
  Role.OPERATIONS_MANAGER,
  Role.AUDITOR,
];

export async function resolveReconciliationViewer(): Promise<
  { ok: true; viewer: ReconciliationViewer } | { ok: false; error: string }
> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { ok: false, error: "Not authenticated" };
  }

  const role = session.user.role as Role;

  return {
    ok: true,
    viewer: {
      userId: session.user.id,
      role,
      branchId: session.user.branchId ?? null,
      name: session.user.name ?? null,
    },
  };
}

export async function canReconcileRole(role: Role, organizationId: string): Promise<boolean> {
  const permissions = await getEffectivePermissions(organizationId, role);
  return hasPermissionInList(permissions, "inventory:reconcile");
}

export async function canViewReconciliationHistory(
  role: Role,
  organizationId: string,
): Promise<boolean> {
  const permissions = await getEffectivePermissions(organizationId, role);
  return (
    hasPermissionInList(permissions, "inventory:view") ||
    hasPermissionInList(permissions, "inventory:reconcile")
  );
}

export async function resolveReconciliationOrgId(userId: string) {
  return resolveOrganizationIdForSession(userId);
}

export function resolveReconciliationBranch(
  viewer: ReconciliationViewer,
  requestedBranchId?: string
): string {
  if (ORG_WIDE_ROLES.includes(viewer.role)) {
    if (!requestedBranchId) {
      throw new Error("Branch is required");
    }
    return requestedBranchId;
  }

  if (!viewer.branchId) {
    throw new Error("No branch assigned to your account");
  }

  if (requestedBranchId && requestedBranchId !== viewer.branchId) {
    throw new Error("You can only reconcile stock for your assigned branch");
  }

  return viewer.branchId;
}
