import { Role } from "@/lib/generated/prisma/client";
import { LITE_ASSIGNABLE_ROLES, LITE_ROLE_LABELS } from "@/lib/excelite-config";

export const roleDisplayNames: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: LITE_ROLE_LABELS.ADMIN,
  EXECUTIVE: "Executive",
  OPERATIONS_MANAGER: "Operations Manager",
  BRANCH_MANAGER: LITE_ROLE_LABELS.BRANCH_MANAGER,
  SUPERVISOR: "Supervisor",
  STAFF: LITE_ROLE_LABELS.STAFF,
  KITCHEN_STAFF: "Kitchen Staff",
  AUDITOR: "Auditor",
  DEVELOPER: "Developer",
  CALL_CENTER: "Call Center",
  WAREHOUSE_STAFF: "Warehouse Staff",
  COMMISSARY_STAFF: "Commissary Staff",
  WAITER: "Waiter",
  PROCUREMENT: "Procurement",
  SALES: "Sales",
  ACCOUNTS: "Accounts",
  GENERIC: "Generic",
};

export const roleDescriptions: Record<Role, string> = {
  SUPER_ADMIN:
    "Platform owner with full access to all features and subscription management",
  ADMIN:
    "Full access to all Excelite POS features, users, and settings",
  EXECUTIVE:
    "Company-wide visibility with full operational and strategic controls",
  OPERATIONS_MANAGER:
    "Manage all branches, staff, inventory, orders, and warehouse operations",
  BRANCH_MANAGER:
    "Manage products, categories, inventory, and orders",
  SUPERVISOR: "Oversee branch operations with limited management capabilities",
  STAFF: "POS checkout and order handling with read-only dashboard",
  KITCHEN_STAFF: "Kitchen display access for order preparation",
  AUDITOR: "Read-only access to all data for compliance and auditing",
  DEVELOPER: "API key management and technical settings access",
  CALL_CENTER: "Dashboard, POS, orders, customers, and delivery",
  WAREHOUSE_STAFF:
    "Raw warehouse inventory, approvals for commissary dispatch, and branch transfers",
  COMMISSARY_STAFF:
    "Back kitchen production, material handling, and branch dispatch requests",
  WAITER: "Table service: seat guests, take orders, and manage assigned tables in POS",
  PROCUREMENT:
    "Purchasing and supply chain: suppliers, warehouse inbound, inventory transfers, and stock receiving",
  SALES:
    "Sales operations: POS, orders, customers, targets, and sales analytics",
  ACCOUNTS:
    "Finance and accounting: transactions, sales records, reports, and reconciliation views",
  GENERIC:
    "Blank-slate role — assign permissions in Settings → Permissions for custom access",
};

/** Roles assignable when creating or editing users in Excelite lite */
export const USER_ASSIGNABLE_ROLES = [...LITE_ASSIGNABLE_ROLES] as const satisfies readonly Role[];

/** Roles an actor may assign when creating or editing users. */
export function getUserAssignableRoles(actorRole: Role): Role[] {
  if (actorRole === "SUPER_ADMIN") {
    return [...USER_ASSIGNABLE_ROLES];
  }
  return [...LITE_ASSIGNABLE_ROLES];
}

/** Optional longer labels for user create/edit role dropdowns. */
export const roleFormLabels: Partial<Record<Role, string>> = {
  SUPER_ADMIN: "Super Admin (Platform Owner)",
  ADMIN: "Owner — full access",
  BRANCH_MANAGER: "Manager — products, inventory & orders",
  STAFF: "Cashier — POS & orders",
};

export function getRoleFormLabel(role: Role): string {
  return roleFormLabels[role] ?? roleDisplayNames[role];
}

export const roleShortNames: Partial<Record<Role, string>> = {
  OPERATIONS_MANAGER: "Ops Manager",
  BRANCH_MANAGER: "Branch Manager",
  KITCHEN_STAFF: "Kitchen Staff",
  CALL_CENTER: "Call Center",
  WAREHOUSE_STAFF: "Warehouse",
  COMMISSARY_STAFF: "Commissary",
  PROCUREMENT: "Procurement",
  SALES: "Sales",
  ACCOUNTS: "Accounts",
  GENERIC: "Generic",
};

export function getRoleShortName(role: Role): string {
  return roleShortNames[role] ?? roleDisplayNames[role];
}
