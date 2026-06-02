import type { ElementType } from "react";
import {
  LayoutDashboard,
  LayoutGrid,
  Building2,
  Package,
  TrendingUp,
  Users,
  Bell,
  FileText,
  Settings,
  Receipt,
  UserCog,
  UtensilsCrossed,
  Key,
  Tag,
  Target,
  ShoppingCart,
  Warehouse,
  Contact,
  Truck,
  ChefHat,
  Monitor,
  Handshake,
} from "lucide-react";
import type { Role, SubscriptionTier } from "@/lib/generated/prisma/client";
import { hasFeature, type TierFeatures } from "@/lib/tier-config";
import { hasAnyPermissionInList, hasPermissionInList } from "@/lib/permissions/check-list";
import type { Permission } from "@/lib/permissions/types";

export type NavItem = {
  name: string;
  href: string;
  icon: ElementType;
  permission?: Permission;
  featureKey?: keyof TierFeatures;
  requiresTableManagement?: boolean;
  openInNewTab?: boolean;
};

export type RouteAccessRule = {
  permissions: Permission[];
  featureKey?: keyof TierFeatures;
  requiresTableManagement?: boolean;
  /** Any signed-in dashboard user (no permission check) */
  authOnly?: boolean;
  match: (pathname: string) => boolean;
};

export const DASHBOARD_NAVIGATION: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  {
    name: "Orders",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    permission: "orders:view",
    openInNewTab: true,
  },
  {
    name: "POS",
    href: "/pos",
    icon: Monitor,
    permission: "pos:access",
    featureKey: "pos",
    openInNewTab: true,
  },
  {
    name: "Kitchen (KDS)",
    href: "/kitchen",
    icon: ChefHat,
    permission: "kitchen:access",
    featureKey: "kitchenDisplay",
  },
  {
    name: "Transactions",
    href: "/dashboard/transactions",
    icon: Receipt,
    permission: "transactions:view",
  },
  {
    name: "Manual POS Entry",
    href: "/dashboard/transactions/manual",
    icon: Receipt,
    permission: "transactions:manual",
  },
  { name: "Branches", href: "/dashboard/branches", icon: Building2, permission: "branches:view" },
  {
    name: "Floor board",
    href: "/dashboard/tables",
    icon: LayoutGrid,
    permission: "tables:view",
    featureKey: "tableManagement",
    requiresTableManagement: true,
  },
  {
    name: "Sales Analytics",
    href: "/dashboard/sales",
    icon: TrendingUp,
    permission: "sales:view",
    featureKey: "salesAnalytics",
  },
  {
    name: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    permission: "inventory:view",
    featureKey: "inventory",
  },
  {
    name: "Warehouse",
    href: "/dashboard/warehouse",
    icon: Warehouse,
    permission: "warehouse:view",
    featureKey: "warehouse",
  },
  { name: "Products", href: "/dashboard/menu", icon: UtensilsCrossed, permission: "menu:view" },
  { name: "Categories", href: "/dashboard/categories", icon: Tag, permission: "categories:view" },
  {
    name: "Customers",
    href: "/dashboard/customers",
    icon: Contact,
    permission: "customers:view",
    featureKey: "crm",
  },
  {
    name: "Suppliers",
    href: "/dashboard/suppliers",
    icon: Handshake,
    permission: "warehouse:view",
    featureKey: "warehouse",
  },
  {
    name: "Delivery",
    href: "/dashboard/delivery",
    icon: Truck,
    permission: "delivery:view",
    featureKey: "delivery",
  },
  {
    name: "Branch Targets",
    href: "/dashboard/targets",
    icon: Target,
    permission: "targets:view",
    featureKey: "targets",
  },
  {
    name: "Staff",
    href: "/dashboard/staff",
    icon: Users,
    permission: "staff:view",
    featureKey: "staffManagement",
  },
  {
    name: "Alerts",
    href: "/dashboard/alerts",
    icon: Bell,
    permission: "alerts:view",
    featureKey: "alerts",
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: FileText,
    permission: "reports:view",
    featureKey: "advancedReports",
  },
  {
    name: "API Keys",
    href: "/dashboard/api-keys",
    icon: Key,
    permission: "api-keys:view",
    featureKey: "apiAccess",
  },
];

export const DASHBOARD_BOTTOM_NAVIGATION: NavItem[] = [
  { name: "User Management", href: "/dashboard/users", icon: UserCog, permission: "users:view" },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, permission: "settings:view" },
];

/** Routes any signed-in user may access (no permission keys required) */
export const AUTH_ONLY_ROUTE_RULES: Pick<RouteAccessRule, "match">[] = [
  { match: (p) => p === "/dashboard/account" || p.startsWith("/dashboard/account/") },
];

export function isAuthOnlyPath(pathname: string): boolean {
  return AUTH_ONLY_ROUTE_RULES.some((rule) => rule.match(pathname));
}

/** First match wins — most specific rules first */
export const ROUTE_ACCESS_RULES: RouteAccessRule[] = [
  {
    match: (p) => p === "/dashboard/account" || p.startsWith("/dashboard/account/"),
    permissions: [],
    authOnly: true,
  },
  {
    match: (p) => p === "/dashboard/transactions/manual",
    permissions: ["transactions:manual"],
  },
  {
    match: (p) => p === "/dashboard/inventory-categories",
    permissions: ["categories:view"],
  },
  {
    match: (p) => /^\/dashboard\/branches\/[^/]+\/tables/.test(p),
    permissions: ["tables:view"],
    featureKey: "tableManagement",
    requiresTableManagement: true,
  },
  {
    match: (p) => p === "/dashboard/tables" || p.startsWith("/dashboard/tables/"),
    permissions: ["tables:view"],
    featureKey: "tableManagement",
    requiresTableManagement: true,
  },
  { match: (p) => p === "/pos" || p.startsWith("/pos/"), permissions: ["pos:access"], featureKey: "pos" },
  {
    match: (p) => p === "/kitchen" || p.startsWith("/kitchen/"),
    permissions: ["kitchen:access"],
    featureKey: "kitchenDisplay",
  },
  { match: (p) => p === "/dashboard", permissions: ["dashboard:view"] },
  { match: (p) => p === "/dashboard/orders" || p.startsWith("/dashboard/orders/"), permissions: ["orders:view"] },
  {
    match: (p) => p === "/dashboard/transactions" || p.startsWith("/dashboard/transactions/"),
    permissions: ["transactions:view"],
  },
  {
    match: (p) => p === "/dashboard/branches" || p.startsWith("/dashboard/branches/"),
    permissions: ["branches:view"],
  },
  { match: (p) => p === "/dashboard/sales" || p.startsWith("/dashboard/sales/"), permissions: ["sales:view"], featureKey: "salesAnalytics" },
  {
    match: (p) => p === "/dashboard/inventory" || p.startsWith("/dashboard/inventory/"),
    permissions: ["inventory:view"],
    featureKey: "inventory",
  },
  {
    match: (p) => p === "/dashboard/warehouse" || p.startsWith("/dashboard/warehouse/"),
    permissions: ["warehouse:view"],
    featureKey: "warehouse",
  },
  { match: (p) => p === "/dashboard/menu" || p.startsWith("/dashboard/menu/"), permissions: ["menu:view"] },
  {
    match: (p) => p === "/dashboard/categories" || p.startsWith("/dashboard/categories/"),
    permissions: ["categories:view"],
  },
  {
    match: (p) => p === "/dashboard/customers" || p.startsWith("/dashboard/customers/"),
    permissions: ["customers:view"],
    featureKey: "crm",
  },
  {
    match: (p) => p === "/dashboard/suppliers" || p.startsWith("/dashboard/suppliers/"),
    permissions: ["warehouse:view"],
    featureKey: "warehouse",
  },
  {
    match: (p) => p === "/dashboard/delivery" || p.startsWith("/dashboard/delivery/"),
    permissions: ["delivery:view"],
    featureKey: "delivery",
  },
  {
    match: (p) => p === "/dashboard/targets" || p.startsWith("/dashboard/targets/"),
    permissions: ["targets:view"],
    featureKey: "targets",
  },
  { match: (p) => p === "/dashboard/staff" || p.startsWith("/dashboard/staff/"), permissions: ["staff:view"], featureKey: "staffManagement" },
  { match: (p) => p === "/dashboard/alerts" || p.startsWith("/dashboard/alerts/"), permissions: ["alerts:view"], featureKey: "alerts" },
  {
    match: (p) => p === "/dashboard/reports" || p.startsWith("/dashboard/reports/"),
    permissions: ["reports:view"],
    featureKey: "advancedReports",
  },
  {
    match: (p) => p === "/dashboard/api-keys" || p.startsWith("/dashboard/api-keys/"),
    permissions: ["api-keys:view"],
    featureKey: "apiAccess",
  },
  { match: (p) => p === "/dashboard/users" || p.startsWith("/dashboard/users/"), permissions: ["users:view"] },
  {
    match: (p) => p === "/dashboard/settings" || p.startsWith("/dashboard/settings/"),
    permissions: ["settings:view"],
  },
  {
    match: (p) => p.startsWith("/dashboard/"),
    permissions: ["dashboard:view"],
  },
];

export type RouteAccessContext = {
  permissions: Permission[];
  orgTier: SubscriptionTier;
  tableManagementEnabled: boolean;
  role: Role;
};

export function matchRouteAccessRule(pathname: string): RouteAccessRule | null {
  for (const rule of ROUTE_ACCESS_RULES) {
    if (rule.match(pathname)) return rule;
  }
  return null;
}

export function canAccessNavItem(
  item: NavItem,
  ctx: RouteAccessContext,
): boolean {
  if (item.permission && !hasAnyPermissionInList(ctx.permissions, [item.permission])) {
    return false;
  }
  if (item.featureKey && !hasFeature(ctx.orgTier, item.featureKey, ctx.role)) {
    return false;
  }
  if (item.requiresTableManagement && !ctx.tableManagementEnabled) {
    return false;
  }
  return true;
}

export function canAccessRouteRule(
  rule: RouteAccessRule,
  ctx: RouteAccessContext,
): boolean {
  if (rule.authOnly) return true;
  if (!hasAnyPermissionInList(ctx.permissions, rule.permissions)) {
    return false;
  }
  if (rule.featureKey && !hasFeature(ctx.orgTier, rule.featureKey, ctx.role)) {
    return false;
  }
  if (rule.requiresTableManagement && !ctx.tableManagementEnabled) {
    return false;
  }
  return true;
}

export function canAccessPath(pathname: string, ctx: RouteAccessContext): boolean {
  const rule = matchRouteAccessRule(pathname);
  if (!rule) return true;
  return canAccessRouteRule(rule, ctx);
}

export function getFirstAccessibleNavHref(ctx: RouteAccessContext): string | null {
  const items = [...DASHBOARD_NAVIGATION, ...DASHBOARD_BOTTOM_NAVIGATION];
  for (const item of items) {
    if (canAccessNavItem(item, ctx)) return item.href;
  }
  return "/dashboard/account";
}

export function filterNavItems(items: NavItem[], ctx: RouteAccessContext): NavItem[] {
  return items.filter((item) => canAccessNavItem(item, ctx));
}

/** Preferred landing route after login or when a guarded route denies access. */
export function resolveSafeLandingHref(ctx: RouteAccessContext): string {
  if (hasPermissionInList(ctx.permissions, "dashboard:view")) return "/dashboard";
  if (hasPermissionInList(ctx.permissions, "pos:access")) return "/pos";
  if (hasPermissionInList(ctx.permissions, "orders:view")) return "/dashboard/orders";
  if (hasPermissionInList(ctx.permissions, "kitchen:access")) return "/kitchen";
  return getFirstAccessibleNavHref(ctx) ?? "/dashboard/account";
}
