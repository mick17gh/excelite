"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@/lib/generated/prisma/client";
import { Role as RoleEnum } from "@/lib/generated/prisma/client";
import {
  canMutateWarehouseFromPermissions,
} from "@/lib/permissions/sync";
import { getEffectivePermissions, hasPermissionInList } from "@/lib/permissions/resolver";
import { resolveOrganizationIdForSession } from "@/lib/permissions/require";

export type WarehouseSessionContext = {
  userId: string;
  role: Role;
  assignedWarehouseId: string | null;
};

export async function getWarehouseSessionContext(): Promise<WarehouseSessionContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, assignedWarehouseId: true },
  });
  if (!user) return null;

  return {
    userId: user.id,
    role: user.role as Role,
    assignedWarehouseId: user.assignedWarehouseId,
  };
}

export async function assertWarehouseMutationAllowed(
  warehouseId?: string | null,
): Promise<{ ok: true; ctx: WarehouseSessionContext } | { ok: false; error: string }> {
  const ctx = await getWarehouseSessionContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };

  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.user?.id
    ? await resolveOrganizationIdForSession(session.user.id)
    : null;
  const permissions =
    organizationId != null
      ? await getEffectivePermissions(organizationId, ctx.role)
      : [];
  if (!canMutateWarehouseFromPermissions(permissions)) {
    return { ok: false, error: "You do not have permission to perform this action" };
  }

  if (
    warehouseId &&
    (ctx.role === "WAREHOUSE_STAFF" || ctx.role === "COMMISSARY_STAFF") &&
    ctx.assignedWarehouseId &&
    ctx.assignedWarehouseId !== warehouseId
  ) {
    return { ok: false, error: "This action is limited to your assigned warehouse" };
  }

  return { ok: true, ctx };
}

const ORG_WIDE_BRANCH_ROLES: Role[] = [
  RoleEnum.SUPER_ADMIN,
  RoleEnum.ADMIN,
  RoleEnum.EXECUTIVE,
  RoleEnum.OPERATIONS_MANAGER,
  RoleEnum.AUDITOR,
  RoleEnum.CALL_CENTER,
];

export async function assertBranchReceiveAllowed(
  toBranchId: string,
): Promise<{ ok: true; ctx: WarehouseSessionContext } | { ok: false; error: string }> {
  const ctx = await getWarehouseSessionContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };

  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.user?.id
    ? await resolveOrganizationIdForSession(session.user.id)
    : null;
  const permissions =
    organizationId != null
      ? await getEffectivePermissions(organizationId, ctx.role)
      : [];
  if (!hasPermissionInList(permissions, "inventory:transfer")) {
    return { ok: false, error: "You do not have permission to perform this action" };
  }

  const userBranchId = (session?.user as { branchId?: string | null } | undefined)?.branchId ?? null;
  if (!ORG_WIDE_BRANCH_ROLES.includes(ctx.role)) {
    if (!userBranchId || userBranchId !== toBranchId) {
      return { ok: false, error: "You can only receive transfers for your branch" };
    }
  }

  return { ok: true, ctx };
}

export async function assertWarehouseDispatchApprovalAllowed(): Promise<
  { ok: true; ctx: WarehouseSessionContext } | { ok: false; error: string }
> {
  const ctx = await getWarehouseSessionContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.user?.id
    ? await resolveOrganizationIdForSession(session.user.id)
    : null;
  const permissions =
    organizationId != null
      ? await getEffectivePermissions(organizationId, ctx.role)
      : [];
  if (!hasPermissionInList(permissions, "warehouse:approve_dispatch")) {
    return { ok: false, error: "You do not have permission to perform this action" };
  }
  return { ok: true, ctx };
}
