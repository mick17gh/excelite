import type { ReportTypePermission } from "@/lib/permissions/report-permissions";
import {
  ALL_REPORT_TYPE_PERMISSIONS,
  REPORT_TYPE_PERMISSION_LABELS,
} from "@/lib/permissions/report-permissions";

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
  | "inventory:reconcile"
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
  | ReportTypePermission
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
  | "suppliers:view"
  | "suppliers:create"
  | "suppliers:edit"
  | "suppliers:delete"
  | "delivery:view"
  | "delivery:manage"
  | "subscriptions:view"
  | "subscriptions:manage"
  | "organization:view"
  | "organization:edit"
  | "tables:view"
  | "tables:manage"
  | "tables:assign"
  | "roles:view"
  | "roles:manage";

export const ALL_PERMISSIONS: Permission[] = [
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
  "inventory:reconcile",
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
  ...ALL_REPORT_TYPE_PERMISSIONS,
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
  "suppliers:view",
  "suppliers:create",
  "suppliers:edit",
  "suppliers:delete",
  "delivery:view",
  "delivery:manage",
  "subscriptions:view",
  "subscriptions:manage",
  "organization:view",
  "organization:edit",
  "tables:view",
  "tables:manage",
  "tables:assign",
  "roles:view",
  "roles:manage",
];

/** Cannot be granted via Settings UI unless actor is SUPER_ADMIN */
export const PLATFORM_ONLY_PERMISSIONS: Permission[] = [
  "subscriptions:manage",
  "branches:delete",
  "inventory:delete",
  "menu:delete",
  "staff:delete",
  "users:delete",
  "warehouse:delete",
];

export type PermissionGroup = {
  id: string;
  label: string;
  permissions: Permission[];
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    permissions: ["dashboard:view", "dashboard:analytics"],
  },
  {
    id: "branches",
    label: "Branches",
    permissions: ["branches:view", "branches:create", "branches:edit", "branches:delete"],
  },
  {
    id: "inventory",
    label: "Inventory",
    permissions: [
      "inventory:view",
      "inventory:create",
      "inventory:edit",
      "inventory:delete",
      "inventory:transfer",
      "inventory:reconcile",
    ],
  },
  {
    id: "menu",
    label: "Menu",
    permissions: ["menu:view", "menu:create", "menu:edit", "menu:delete", "categories:view", "categories:manage"],
  },
  {
    id: "staff",
    label: "Staff",
    permissions: ["staff:view", "staff:create", "staff:edit", "staff:delete", "staff:schedules"],
  },
  {
    id: "transactions",
    label: "Transactions & Sales",
    permissions: [
      "transactions:view",
      "transactions:create",
      "transactions:void",
      "transactions:manual",
      "transactions:purge",
      "sales:view",
      "sales:analytics",
    ],
  },
  {
    id: "reports",
    label: "Reports & Targets",
    permissions: [
      "reports:view",
      "reports:generate",
      "reports:export",
      "alerts:view",
      "alerts:manage",
      "targets:view",
      "targets:create",
      "targets:edit",
    ],
  },
  {
    id: "report-types",
    label: "Report types",
    permissions: [...ALL_REPORT_TYPE_PERMISSIONS],
  },
  {
    id: "users",
    label: "Users & Roles",
    permissions: [
      "users:view",
      "users:create",
      "users:edit",
      "users:delete",
      "roles:view",
      "roles:manage",
    ],
  },
  {
    id: "settings",
    label: "Settings & API",
    permissions: [
      "settings:view",
      "settings:edit",
      "api-keys:view",
      "api-keys:manage",
      "organization:view",
      "organization:edit",
      "subscriptions:view",
      "subscriptions:manage",
    ],
  },
  {
    id: "operations",
    label: "POS, Kitchen & Orders",
    permissions: [
      "pos:access",
      "kitchen:access",
      "orders:view",
      "orders:create",
      "orders:edit",
      "orders:assign",
      "orders:cancel",
      "tables:view",
      "tables:manage",
      "tables:assign",
    ],
  },
  {
    id: "warehouse",
    label: "Warehouse & Commissary",
    permissions: [
      "warehouse:view",
      "warehouse:create",
      "warehouse:edit",
      "warehouse:delete",
      "warehouse:transfer",
      "warehouse:approve_dispatch",
      "commissary:view",
      "commissary:production",
      "commissary:request_dispatch",
    ],
  },
  {
    id: "customers",
    label: "Supplier, Customer & Delivery",
    permissions: [
      "suppliers:view",
      "suppliers:create",
      "suppliers:edit",
      "suppliers:delete",
      "customers:view",
      "customers:create",
      "customers:edit",
      "delivery:view",
      "delivery:manage",
    ],
  },
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "dashboard:view": "View dashboard",
  "dashboard:analytics": "View analytics",
  "branches:view": "View branches",
  "branches:create": "Create branches",
  "branches:edit": "Edit branches",
  "branches:delete": "Delete branches",
  "inventory:view": "View inventory",
  "inventory:create": "Create inventory",
  "inventory:edit": "Edit inventory",
  "inventory:delete": "Delete inventory",
  "inventory:transfer": "Transfer inventory",
  "inventory:reconcile": "Reconcile stock",
  "menu:view": "View menu",
  "menu:create": "Create menu items",
  "menu:edit": "Edit menu items",
  "menu:delete": "Delete menu items",
  "categories:view": "View categories",
  "categories:manage": "Manage categories",
  "staff:view": "View staff",
  "staff:create": "Create staff",
  "staff:edit": "Edit staff",
  "staff:delete": "Delete staff",
  "staff:schedules": "Manage schedules",
  "transactions:view": "View transactions",
  "transactions:create": "Create transactions",
  "transactions:void": "Void transactions",
  "transactions:manual": "Manual transactions",
  "transactions:purge": "Purge data",
  "sales:view": "View sales",
  "sales:analytics": "Sales analytics",
  "reports:view": "Access reports page",
  "reports:generate": "All report types (full access)",
  "reports:export": "Export reports (CSV/Excel)",
  ...REPORT_TYPE_PERMISSION_LABELS,
  "alerts:view": "View alerts",
  "alerts:manage": "Manage alerts",
  "targets:view": "View targets",
  "targets:create": "Create targets",
  "targets:edit": "Edit targets",
  "users:view": "View users",
  "users:create": "Create users",
  "users:edit": "Edit users",
  "users:delete": "Delete users",
  "settings:view": "View settings",
  "settings:edit": "Edit settings",
  "api-keys:view": "View API keys",
  "api-keys:manage": "Manage API keys",
  "pos:access": "POS access",
  "kitchen:access": "Kitchen display",
  "orders:view": "View orders",
  "orders:create": "Create orders",
  "orders:edit": "Edit orders",
  "orders:assign": "Assign orders",
  "orders:cancel": "Cancel orders",
  "warehouse:view": "View warehouse",
  "warehouse:create": "Create warehouse items",
  "warehouse:edit": "Edit warehouse",
  "warehouse:delete": "Delete warehouse",
  "warehouse:transfer": "Warehouse transfers",
  "warehouse:approve_dispatch": "Approve dispatch",
  "commissary:view": "View commissary",
  "commissary:production": "Commissary production",
  "commissary:request_dispatch": "Request dispatch",
  "customers:view": "View customers",
  "customers:create": "Create customers",
  "customers:edit": "Edit customers",
  "suppliers:view": "View suppliers",
  "suppliers:create": "Create suppliers",
  "suppliers:edit": "Edit suppliers",
  "suppliers:delete": "Delete suppliers",
  "delivery:view": "View delivery",
  "delivery:manage": "Manage delivery",
  "subscriptions:view": "View subscription",
  "subscriptions:manage": "Manage subscription tier",
  "organization:view": "View organization",
  "organization:edit": "Edit organization",
  "tables:view": "View tables",
  "tables:manage": "Manage tables",
  "tables:assign": "Assign tables",
  "roles:view": "View role permissions",
  "roles:manage": "Manage role permissions",
};

export const EDITABLE_MATRIX_ROLES = [
  "ADMIN",
  "EXECUTIVE",
  "OPERATIONS_MANAGER",
  "BRANCH_MANAGER",
  "SUPERVISOR",
  "STAFF",
  "KITCHEN_STAFF",
  "AUDITOR",
  "DEVELOPER",
  "CALL_CENTER",
  "WAREHOUSE_STAFF",
  "COMMISSARY_STAFF",
  "WAITER",
  "PROCUREMENT",
  "SALES",
  "ACCOUNTS",
  "GENERIC",
] as const;
