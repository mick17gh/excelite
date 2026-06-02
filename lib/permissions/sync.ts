import { Role } from "@/lib/generated/prisma/client";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions/defaults";
import { canAccessPath } from "@/lib/permissions/routes";
import type { Permission } from "@/lib/permissions/types";

/** Permissions that allow warehouse write operations (DB matrix is source of truth). */
export const WAREHOUSE_MUTATE_PERMISSIONS: Permission[] = [
  "warehouse:create",
  "warehouse:edit",
  "warehouse:transfer",
  "warehouse:approve_dispatch",
  "commissary:production",
];

export function canMutateWarehouseFromPermissions(
  permissions: Permission[],
): boolean {
  return WAREHOUSE_MUTATE_PERMISSIONS.some((p) => permissions.includes(p));
}

const WAREHOUSE_OPS_MUTATE_ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "WAREHOUSE_STAFF",
  "COMMISSARY_STAFF",
];

const WAREHOUSE_OPS_READ_ONLY_ROLES: Role[] = [
  "EXECUTIVE",
  "OPERATIONS_MANAGER",
  "AUDITOR",
];

/** @deprecated Prefer canMutateWarehouseFromPermissions with DB-backed permissions */
export function canMutateWarehouseOps(role: Role | undefined | null): boolean {
  if (!role) return false;
  return WAREHOUSE_OPS_MUTATE_ROLES.includes(role);
}

export function isWarehouseOpsReadOnly(role: Role | undefined | null): boolean {
  if (!role) return false;
  return WAREHOUSE_OPS_READ_ONLY_ROLES.includes(role);
}

/** Sync check against code defaults (fallback). Prefer hasPermissionInList with DB-backed list in UI. */
export function hasPermission(
  role: Role | undefined | null,
  permission: Permission,
): boolean {
  if (!role) return false;
  return DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(
  role: Role | undefined | null,
  permissions: Permission[],
): boolean {
  if (!role) return false;
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(
  role: Role | undefined | null,
  permissions: Permission[],
): boolean {
  if (!role) return false;
  return permissions.every((p) => hasPermission(role, p));
}

export function getPermissionsForRole(role: Role): Permission[] {
  return [...(DEFAULT_ROLE_PERMISSIONS[role] ?? [])];
}

/** @deprecated Use canAccessPath with DB-backed permissions from the layout/resolver */
export function canAccessRoute(
  role: Role | undefined | null,
  route: string,
): boolean {
  if (!role) return false;
  const permissions = getPermissionsForRole(role);
  return canAccessPath(route, {
    permissions,
    orgTier: "ENTERPRISE",
    tableManagementEnabled: true,
    role,
  });
}
