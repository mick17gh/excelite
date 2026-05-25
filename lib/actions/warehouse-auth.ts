"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@/lib/generated/prisma/client";
import {
  canMutateWarehouseOps,
  hasPermission,
} from "@/lib/permissions";

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
  if (!canMutateWarehouseOps(ctx.role)) {
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

export async function assertWarehouseDispatchApprovalAllowed(): Promise<
  { ok: true; ctx: WarehouseSessionContext } | { ok: false; error: string }
> {
  const ctx = await getWarehouseSessionContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  if (
    !canMutateWarehouseOps(ctx.role) &&
    !hasPermission(ctx.role, "warehouse:approve_dispatch")
  ) {
    return { ok: false, error: "You do not have permission to perform this action" };
  }
  return { ok: true, ctx };
}
