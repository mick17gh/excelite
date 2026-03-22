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
  | "kitchen:access"
  | "orders:view"
  | "orders:create"
  | "orders:edit"
  | "orders:assign"
  | "orders:cancel"
  | "warehouse:view"
  | "warehouse:create"
  | "warehouse:edit"
  | "warehouse:delete"
  | "warehouse:transfer"
  | "customers:view"
  | "customers:create"
  | "customers:edit"
  | "delivery:view"
  | "delivery:manage"
  | "subscriptions:view"
  | "subscriptions:manage"
  | "organization:view"
  | "organization:edit";

// All permissions - used by SUPER_ADMIN
const ALL_PERMISSIONS: Permission[] = [
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
  "orders:view",
  "orders:create",
  "orders:edit",
  "orders:assign",
  "orders:cancel",
  "warehouse:view",
  "warehouse:create",
  "warehouse:edit",
  "warehouse:delete",
  "warehouse:transfer",
  "customers:view",
  "customers:create",
  "customers:edit",
  "delivery:view",
  "delivery:manage",
  "subscriptions:view",
  "subscriptions:manage",
  "organization:view",
  "organization:edit",
];

const rolePermissions: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,

  ADMIN: [
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
    "users:create",
    "users:edit",
    "settings:view",
    "settings:edit",
    "api-keys:view",
    "api-keys:manage",
    "pos:access",
    "kitchen:access",
    "orders:view",
    "orders:create",
    "orders:edit",
    "orders:assign",
    "orders:cancel",
    "warehouse:view",
    "warehouse:create",
    "warehouse:edit",
    "warehouse:transfer",
    "customers:view",
    "customers:create",
    "customers:edit",
    "delivery:view",
    "delivery:manage",
    "subscriptions:view",
    "organization:view",
    "organization:edit",
  ],

  EXECUTIVE: [
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
    "users:create",
    "users:edit",
    "settings:view",
    "settings:edit",
    "api-keys:view",
    "api-keys:manage",
    "pos:access",
    "kitchen:access",
    "orders:view",
    "orders:create",
    "orders:edit",
    "orders:assign",
    "orders:cancel",
    "warehouse:view",
    "warehouse:create",
    "warehouse:edit",
    "warehouse:transfer",
    "customers:view",
    "customers:create",
    "customers:edit",
    "delivery:view",
    "delivery:manage",
    "subscriptions:view",
    "organization:view",
    "organization:edit",
  ],

  OPERATIONS_MANAGER: [
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
    "pos:access",
    "kitchen:access",
    "orders:view",
    "orders:create",
    "orders:edit",
    "orders:assign",
    "orders:cancel",
    "warehouse:view",
    "warehouse:create",
    "warehouse:edit",
    "warehouse:transfer",
    "customers:view",
    "customers:create",
    "customers:edit",
    "delivery:view",
    "delivery:manage",
    "organization:view",
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
    "orders:view",
    "orders:create",
    "orders:edit",
    "orders:assign",
    "customers:view",
    "customers:create",
    "customers:edit",
    "delivery:view",
  ],

  SUPERVISOR: [
    "dashboard:view",
    "branches:view",
    "inventory:view",
    "inventory:create",
    "inventory:edit",
    "menu:view",
    "categories:view",
    "staff:view",
    "staff:schedules",
    "transactions:view",
    "transactions:create",
    "transactions:manual",
    "sales:view",
    "alerts:view",
    "pos:access",
    "kitchen:access",
    "orders:view",
    "orders:create",
    "orders:edit",
    "customers:view",
    "delivery:view",
  ],

  STAFF: [
    "dashboard:view",
    "transactions:view",
    "transactions:create",
    "sales:view",
    "pos:access",
    "kitchen:access",
    "orders:view",
    "orders:create",
  ],

  KITCHEN_STAFF: [
    "kitchen:access",
    "orders:view",
  ],

  AUDITOR: [
    "dashboard:view",
    "dashboard:analytics",
    "branches:view",
    "inventory:view",
    "transactions:view",
    "sales:view",
    "sales:analytics",
    "reports:view",
    "reports:generate",
    "reports:export",
    "alerts:view",
    "targets:view",
    "orders:view",
    "warehouse:view",
    "customers:view",
  ],

  DEVELOPER: [
    "dashboard:view",
    "api-keys:view",
    "api-keys:manage",
    "settings:view",
  ],

  CALL_CENTER: [
    "dashboard:view",
    "branches:view",
    "menu:view",
    "categories:view",
    "orders:view",
    "orders:create",
    "orders:edit",
    "orders:assign",
    "customers:view",
    "customers:create",
    "customers:edit",
    "delivery:view",
    "delivery:manage",
  ],

  WAREHOUSE_STAFF: [
    "dashboard:view",
    "inventory:view",
    "inventory:create",
    "inventory:edit",
    "inventory:transfer",
    "warehouse:view",
    "warehouse:create",
    "warehouse:edit",
    "warehouse:transfer",
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
    "/dashboard/orders": ["orders:view"],
    "/dashboard/warehouse": ["warehouse:view"],
    "/dashboard/customers": ["customers:view"],
    "/dashboard/delivery": ["delivery:view"],
    "/dashboard/subscriptions": ["subscriptions:view"],
    "/pos": ["pos:access"],
    "/kitchen": ["kitchen:access"],
  };

  const requiredPermissions = routePermissions[route];
  if (!requiredPermissions) return true;

  return hasAnyPermission(role, requiredPermissions);
}

export const roleDisplayNames: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  EXECUTIVE: "Executive",
  OPERATIONS_MANAGER: "Operations Manager",
  BRANCH_MANAGER: "Branch Manager",
  SUPERVISOR: "Supervisor",
  STAFF: "Staff",
  KITCHEN_STAFF: "Kitchen Staff",
  AUDITOR: "Auditor",
  DEVELOPER: "Developer",
  CALL_CENTER: "Call Center",
  WAREHOUSE_STAFF: "Warehouse Staff",
};

export const roleDescriptions: Record<Role, string> = {
  SUPER_ADMIN: "Platform owner with full access to all features and subscription management",
  ADMIN: "Organization administrator with full operational access (cannot manage subscriptions)",
  EXECUTIVE: "Company-wide visibility with full operational and strategic controls",
  OPERATIONS_MANAGER: "Manage all branches, staff, inventory, orders, and warehouse operations",
  BRANCH_MANAGER: "Manage a specific branch including staff, inventory, orders, and sales",
  SUPERVISOR: "Oversee branch operations with limited management capabilities",
  STAFF: "POS access for processing transactions and basic order management",
  KITCHEN_STAFF: "Kitchen display access for order preparation",
  AUDITOR: "Read-only access to all data for compliance and auditing",
  DEVELOPER: "API key management and technical settings access",
  CALL_CENTER: "Order placement, customer management, and delivery coordination",
  WAREHOUSE_STAFF: "Warehouse inventory management and branch transfer operations",
};
