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
};
