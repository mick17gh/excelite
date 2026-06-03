import { Role } from "@/lib/generated/prisma/client";

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
  PROCUREMENT: "Procurement",
  SALES: "Sales",
  ACCOUNTS: "Accounts",
  GENERIC: "Generic",
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

/** Roles assignable when creating or editing users (excludes SUPER_ADMIN platform-only flows where restricted). */
export const USER_ASSIGNABLE_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "EXECUTIVE",
  "OPERATIONS_MANAGER",
  "BRANCH_MANAGER",
  "SUPERVISOR",
  "STAFF",
  "WAITER",
  "KITCHEN_STAFF",
  "PROCUREMENT",
  "SALES",
  "ACCOUNTS",
  "GENERIC",
  "AUDITOR",
  "DEVELOPER",
  "CALL_CENTER",
  "WAREHOUSE_STAFF",
  "COMMISSARY_STAFF",
] as const satisfies readonly Role[];

/** Optional longer labels for user create/edit role dropdowns. */
export const roleFormLabels: Partial<Record<Role, string>> = {
  SUPER_ADMIN: "Super Admin (Platform Owner)",
  ADMIN: "Admin (Organization Owner)",
  EXECUTIVE: "Executive (Strategic Controls)",
  STAFF: "Staff (POS, KDS, Orders & Customers)",
  WAITER: "Waiter (table service POS)",
  AUDITOR: "Auditor (Read-Only)",
  DEVELOPER: "Developer (API Access)",
  PROCUREMENT: "Procurement (Suppliers & warehouse receiving)",
  SALES: "Sales (POS, orders & customers)",
  ACCOUNTS: "Accounts (Transactions & reports)",
  GENERIC: "Generic (custom permissions via matrix)",
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
