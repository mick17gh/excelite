"use client";

import { createContext, useContext, useMemo } from "react";
import type { Role } from "@/lib/generated/prisma/client";
import {
  hasAllPermissionsInList,
  hasAnyPermissionInList,
  hasPermissionInList,
} from "@/lib/permissions/check-list";
import type { Permission } from "@/lib/permissions/types";

type PermissionsContextValue = {
  permissions: Permission[];
  role: Role;
  organizationId: string | null;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({
  children,
  permissions,
  role,
  organizationId,
}: {
  children: React.ReactNode;
  permissions: Permission[];
  role: Role;
  organizationId: string | null;
}) {
  const value = useMemo(
    () => ({ permissions, role, organizationId }),
    [permissions, role, organizationId],
  );
  return (
    <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error("usePermissions must be used within PermissionsProvider");
  }
  return {
    ...ctx,
    hasPermission: (permission: Permission) =>
      hasPermissionInList(ctx.permissions, permission),
    hasAnyPermission: (required: Permission[]) =>
      hasAnyPermissionInList(ctx.permissions, required),
    hasAllPermissions: (required: Permission[]) =>
      hasAllPermissionsInList(ctx.permissions, required),
  };
}

/** Safe variant for components that may render outside dashboard layout */
export function usePermissionsOptional() {
  const ctx = useContext(PermissionsContext);
  return ctx
    ? {
        ...ctx,
        hasPermission: (permission: Permission) =>
          hasPermissionInList(ctx.permissions, permission),
      }
    : null;
}
