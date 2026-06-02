import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { Role } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions/defaults";
import { ensureOrgRolePermissionsSeeded } from "@/lib/permissions/seed";
import {
  hasAllPermissionsInList,
  hasAnyPermissionInList,
  hasPermissionInList,
} from "@/lib/permissions/check-list";
import { ROLE_PERMISSION_EMPTY_MARKER } from "@/lib/permissions/constants";
import { ALL_PERMISSIONS, type Permission } from "@/lib/permissions/types";

function parsePermissionRows(rows: { permission: string }[]): Permission[] {
  if (rows.some((r) => r.permission === ROLE_PERMISSION_EMPTY_MARKER)) {
    return [];
  }
  return rows
    .map((r) => r.permission as Permission)
    .filter((p) => ALL_PERMISSIONS.includes(p));
}

export { hasPermissionInList, hasAnyPermissionInList, hasAllPermissionsInList };

export const getEffectivePermissions = cache(
  async (organizationId: string, role: Role): Promise<Permission[]> => {
    noStore();

    if (role === "SUPER_ADMIN") {
      return ALL_PERMISSIONS;
    }

    try {
      await ensureOrgRolePermissionsSeeded(db, organizationId);
    } catch (error) {
      console.error("[getEffectivePermissions] seed check failed:", error);
      return [...(DEFAULT_ROLE_PERMISSIONS[role] ?? [])];
    }

    let rows: { permission: string }[];
    try {
      rows = await db.orgRolePermission.findMany({
        where: { organizationId, role },
        select: { permission: true },
      });
    } catch (error) {
      console.error("[getEffectivePermissions] DB read failed:", error);
      return [...(DEFAULT_ROLE_PERMISSIONS[role] ?? [])];
    }

    if (rows.length === 0) {
      const orgHasMatrix = await db.orgRolePermission.count({
        where: { organizationId },
      });
      if (orgHasMatrix > 0) {
        return [];
      }
      return [...(DEFAULT_ROLE_PERMISSIONS[role] ?? [])];
    }

    return parsePermissionRows(rows);
  },
);

/** @deprecated No-op; kept for callers after removing cross-request module memo. */
export function clearPermissionsMemo() {
  /* React cache() is per-request; DB is source of truth via noStore(). */
}

export async function hasPermissionForOrg(
  organizationId: string,
  role: Role,
  permission: Permission,
): Promise<boolean> {
  const permissions = await getEffectivePermissions(organizationId, role);
  return hasPermissionInList(permissions, permission);
}
