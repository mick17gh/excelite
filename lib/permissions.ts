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
  | "warehouse:approve_dispatch"
  | "commissary:view"
  | "commissary:production"
  | "commissary:request_dispatch"
  | "transactions:purge"
  | "customers:view"
  | "customers:create"
  | "customers:edit"
  | "delivery:view"
  | "delivery:manage"
  | "subscriptions:view"
  | "subscriptions:manage"
  | "organization:view"
  | "organization:edit"
  | "tables:view"
  | "tables:manage"
  | "tables:assign";

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
  "warehouse:approve_dispatch",
  "commissary:view",
  "commissary:production",
  "commissary:request_dispatch",
  "transactions:purge",
  "customers:view",
  "customers:create",
  "customers:edit",
  "delivery:view",
  "delivery:manage",
  "subscriptions:view",
  "subscriptions:manage",
  "organization:view",
  "organization:edit",
  "tables:view",
  "tables:manage",
  "tables:assign",
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
    "warehouse:approve_dispatch",
    "commissary:view",
    "commissary:production",
    "commissary:request_dispatch",
    "transactions:purge",
    "customers:view",
    "customers:create",
    "customers:edit",
    "delivery:view",
    "delivery:manage",
    "subscriptions:view",
    "organization:view",
    "organization:edit",
    "tables:view",
    "tables:manage",
    "tables:assign",
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
    "tables:view",
    "tables:manage",
    "tables:assign",
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
    "tables:view",
    "tables:manage",
    "tables:assign",
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
    "tables:view",
    "tables:manage",
    "tables:assign",
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
    "tables:view",
    "tables:assign",
  ],

  WAITER: [
    "dashboard:view",
    "pos:access",
    "orders:view",
    "orders:create",
    "orders:edit",
    "tables:view",
    "tables:assign",
    "customers:view",
  ],

  STAFF: [
    "dashboard:view",
    "pos:access",
    "kitchen:access",
    "orders:view",
    "orders:create",
    "orders:edit",
    "orders:assign",
    "orders:cancel",
    "transactions:view",
    "transactions:create",
    "customers:view",
    "customers:create",
    "customers:edit",
    "tables:view",
  ],

  KITCHEN_STAFF: ["kitchen:access", "orders:view"],

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
    "warehouse:approve_dispatch",
  ],

  COMMISSARY_STAFF: [
    "dashboard:view",
    "commissary:view",
    "commissary:production",
    "commissary:request_dispatch",
    "warehouse:view",
    "warehouse:transfer",
  ],
};

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

/** Approve/receive/reject transfers and other warehouse stock mutations. */
export function canMutateWarehouseOps(role: Role | undefined | null): boolean {
  if (!role) return false;
  return WAREHOUSE_OPS_MUTATE_ROLES.includes(role);
}

/** See warehouse ops tables but not action menus (Exec, Ops, Auditor). */
export function isWarehouseOpsReadOnly(role: Role | undefined | null): boolean {
  if (!role) return false;
  return WAREHOUSE_OPS_READ_ONLY_ROLES.includes(role);
}

export function hasPermission(
  role: Role | undefined | null,
  permission: Permission,
): boolean {
  if (!role) return false;
  return rolePermissions[role]?.includes(permission) ?? false;
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
  return rolePermissions[role] || [];
}

export function canAccessRoute(
  role: Role | undefined | null,
  route: string,
): boolean {
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
    "/dashboard/suppliers": ["warehouse:view"],
    "/dashboard/delivery": ["delivery:view"],
    "/dashboard/subscriptions": ["subscriptions:view"],
    "/pos": ["pos:access"],
    "/kitchen": ["kitchen:access"],
    "/dashboard/tables": ["tables:view"],
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
  COMMISSARY_STAFF: "Commissary Staff",
  WAITER: "Waiter",
};

export const roleDescriptions: Record<Role, string> = {
  SUPER_ADMIN:
    "Platform owner with full access to all features and subscription management",
  ADMIN:
    "Organization administrator with full operational access (cannot manage subscriptions)",
  EXECUTIVE:
    "Company-wide visibility with full operational and strategic controls",
  OPERATIONS_MANAGER:
    "Manage all branches, staff, inventory, orders, and warehouse operations",
  BRANCH_MANAGER:
    "Manage a specific branch including staff, inventory, orders, and sales",
  SUPERVISOR: "Oversee branch operations with limited management capabilities",
  STAFF: "Dashboard, POS, kitchen (KDS), orders, floor board pay, and customers",
  KITCHEN_STAFF: "Kitchen display access for order preparation",
  AUDITOR: "Read-only access to all data for compliance and auditing",
  DEVELOPER: "API key management and technical settings access",
  CALL_CENTER: "Dashboard, orders, and customers only",
  WAREHOUSE_STAFF:
    "Raw warehouse inventory, approvals for commissary dispatch, and branch transfers",
  COMMISSARY_STAFF:
    "Back kitchen production, material handling, and branch dispatch requests",
  WAITER: "Table service: seat guests, take orders, and manage assigned tables in POS",
};
