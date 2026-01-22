import { Role } from "@/lib/generated/prisma/client";

export type Permission =
  | "dashboard:view"
  | "dashboard:analytics"
  | "branches:view"
  | "branches:create"
  | "branches:edit"
  | "branches:delete"
  | "inventory:view"
  | "inventory:create"
  | "inventory:edit"
  | "inventory:delete"
  | "inventory:transfer"
  | "menu:view"
  | "menu:create"
  | "menu:edit"
  | "menu:delete"
  | "categories:view"
  | "categories:manage"
  | "staff:view"
  | "staff:create"
  | "staff:edit"
  | "staff:delete"
  | "staff:schedules"
  | "transactions:view"
  | "transactions:create"
  | "transactions:void"
  | "transactions:manual"
  | "sales:view"
  | "sales:analytics"
  | "reports:view"
  | "reports:generate"
  | "reports:export"
  | "alerts:view"
  | "alerts:manage"
  | "targets:view"
  | "targets:create"
  | "targets:edit"
  | "users:view"
  | "users:create"
  | "users:edit"
  | "users:delete"
  | "settings:view"
  | "settings:edit"
  | "api-keys:view"
  | "api-keys:manage"
  | "pos:access"
  | "kitchen:access";

const rolePermissions: Record<Role, Permission[]> = {
  CEO: [
    "dashboard:view",
    "dashboard:analytics",
    "branches:view",
    "branches:create",
    "branches:edit",
    "branches:delete",
    "inventory:view",
    "inventory:create",
    "inventory:edit",
    "inventory:delete",
    "inventory:transfer",
    "menu:view",
    "menu:create",
    "menu:edit",
    "menu:delete",
    "categories:view",
    "categories:manage",
    "staff:view",
    "staff:create",
    "staff:edit",
    "staff:delete",
    "staff:schedules",
    "transactions:view",
    "transactions:create",
    "transactions:void",
    "transactions:manual",
    "sales:view",
    "sales:analytics",
    "reports:view",
    "reports:generate",
    "reports:export",
    "alerts:view",
    "alerts:manage",
    "targets:view",
    "targets:create",
    "targets:edit",
    "users:view",
    "users:create",
    "users:edit",
    "users:delete",
    "settings:view",
    "settings:edit",
    "api-keys:view",
    "api-keys:manage",
    "pos:access",
    "kitchen:access",
  ],
  SENIOR_MANAGEMENT: [
    "dashboard:view",
    "dashboard:analytics",
    "branches:view",
    "branches:create",
    "branches:edit",
    "inventory:view",
    "inventory:create",
    "inventory:edit",
    "inventory:transfer",
    "menu:view",
    "menu:create",
    "menu:edit",
    "categories:view",
    "categories:manage",
    "staff:view",
    "staff:create",
    "staff:edit",
    "staff:schedules",
    "transactions:view",
    "transactions:create",
    "transactions:void",
    "transactions:manual",
    "sales:view",
    "sales:analytics",
    "reports:view",
    "reports:generate",
    "reports:export",
    "alerts:view",
    "alerts:manage",
    "targets:view",
    "targets:create",
    "targets:edit",
    "users:view",
    "settings:view",
    "api-keys:view",
    "pos:access",
    "kitchen:access",
  ],
  BRANCH_MANAGER: [
    "dashboard:view",
    "dashboard:analytics",
    "branches:view",
    "inventory:view",
    "inventory:create",
    "inventory:edit",
    "inventory:transfer",
    "menu:view",
    "categories:view",
    "staff:view",
    "staff:create",
    "staff:edit",
    "staff:schedules",
    "transactions:view",
    "transactions:create",
    "transactions:void",
    "transactions:manual",
    "sales:view",
    "sales:analytics",
    "reports:view",
    "reports:generate",
    "reports:export",
    "alerts:view",
    "targets:view",
    "settings:view",
    "pos:access",
    "kitchen:access",
  ],
  FINANCE_OPS: [
    "dashboard:view",
    "dashboard:analytics",
    "branches:view",
    "inventory:view",
    "transactions:view",
    "transactions:manual",
    "sales:view",
    "sales:analytics",
    "reports:view",
    "reports:generate",
    "reports:export",
    "alerts:view",
    "targets:view",
    "targets:create",
    "targets:edit",
  ],
  CASHIER: [
    "dashboard:view",
    "transactions:view",
    "transactions:create",
    "sales:view",
    "pos:access",
    "kitchen:access",
  ],
};

export function hasPermission(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role | undefined | null, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: Role | undefined | null, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every((p) => hasPermission(role, p));
}

export function getPermissionsForRole(role: Role): Permission[] {
  return rolePermissions[role] || [];
}

export function canAccessRoute(role: Role | undefined | null, route: string): boolean {
  if (!role) return false;

  const routePermissions: Record<string, Permission[]> = {
    "/dashboard": ["dashboard:view"],
    "/dashboard/branches": ["branches:view"],
    "/dashboard/inventory": ["inventory:view"],
    "/dashboard/menu": ["menu:view"],
    "/dashboard/categories": ["categories:view"],
    "/dashboard/staff": ["staff:view"],
    "/dashboard/transactions": ["transactions:view"],
    "/dashboard/transactions/manual": ["transactions:manual"],
    "/dashboard/sales": ["sales:view"],
    "/dashboard/reports": ["reports:view"],
    "/dashboard/alerts": ["alerts:view"],
    "/dashboard/targets": ["targets:view"],
    "/dashboard/users": ["users:view"],
    "/dashboard/settings": ["settings:view"],
    "/dashboard/api-keys": ["api-keys:view"],
    "/pos": ["pos:access"],
    "/kitchen": ["kitchen:access"],
  };

  const requiredPermissions = routePermissions[route];
  if (!requiredPermissions) return true; // No specific permissions required

  return hasAnyPermission(role, requiredPermissions);
}

export const roleDisplayNames: Record<Role, string> = {
  CEO: "Chief Executive Officer",
  SENIOR_MANAGEMENT: "Senior Management",
  BRANCH_MANAGER: "Branch Manager",
  FINANCE_OPS: "Finance & Operations",
  CASHIER: "Cashier",
};

export const roleDescriptions: Record<Role, string> = {
  CEO: "Full access to all features and settings across all branches",
  SENIOR_MANAGEMENT: "Access to most features with limited administrative controls",
  BRANCH_MANAGER: "Manage a specific branch including staff, inventory, and sales",
  FINANCE_OPS: "Access to financial data, reports, and targets management",
  CASHIER: "POS access for processing transactions and viewing basic sales data",
};
