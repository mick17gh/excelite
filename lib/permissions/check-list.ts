import type { Permission } from "@/lib/permissions/types";

export function hasPermissionInList(
  permissions: Permission[],
  permission: Permission,
): boolean {
  return permissions.includes(permission);
}

export function hasAnyPermissionInList(
  permissions: Permission[],
  required: Permission[],
): boolean {
  return required.some((p) => permissions.includes(p));
}

export function hasAllPermissionsInList(
  permissions: Permission[],
  required: Permission[],
): boolean {
  return required.every((p) => permissions.includes(p));
}
