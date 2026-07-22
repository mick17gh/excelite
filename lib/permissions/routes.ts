import type { ElementType } from "react";
import {
  LayoutDashboard,
  Package,
  Settings,
  UserCog,
  UtensilsCrossed,
  Tag,
  ShoppingCart,
  Monitor,
} from "lucide-react";
import type { Role, SubscriptionTier } from "@/lib/generated/prisma/client";
import { hasFeature, isSuperAdmin, type TierFeatures } from "@/lib/tier-config";
import { isLiteBlockedPath } from "@/lib/excelite-config";
import { hasAnyPermissionInList, hasPermissionInList } from "@/lib/permissions/check-list";
import type { Permission } from "@/lib/permissions/types";

export type NavItem = {
  name: string;
  href: string;
  icon: ElementType;
  permission?: Permission;
  permissionsAny?: Permission[];
  featureKey?: keyof TierFeatures;
  requiresTableManagement?: boolean;
};

export type RouteAccessRule = {
  permissions: Permission[];
  featureKey?: keyof TierFeatures;
  requiresTableManagement?: boolean;
  authOnly?: boolean;
  match: (pathname: string) => boolean;
};

/** Excelite lite — core navigation only */
export const DASHBOARD_NAVIGATION: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { name: "POS", href: "/pos", icon: Monitor, permission: "pos:access", featureKey: "pos" },
  {
    name: "Orders",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    permission: "orders:view",
  },
  { name: "Products", href: "/dashboard/menu", icon: UtensilsCrossed, permission: "menu:view" },
  { name: "Categories", href: "/dashboard/categories", icon: Tag, permission: "categories:view" },
  {
    name: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    permission: "inventory:view",
    featureKey: "inventory",
  },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, permission: "settings:view" },
];

export const DASHBOARD_BOTTOM_NAVIGATION: NavItem[] = [
  { name: "User Management", href: "/dashboard/users", icon: UserCog, permission: "users:view" },
];

export const AUTH_ONLY_ROUTE_RULES: Pick<RouteAccessRule, "match">[] = [
  { match: (p) => p === "/dashboard/account" || p.startsWith("/dashboard/account/") },
];

export function isAuthOnlyPath(pathname: string): boolean {
  return AUTH_ONLY_ROUTE_RULES.some((rule) => rule.match(pathname));
}

export const ROUTE_ACCESS_RULES: RouteAccessRule[] = [
  {
    match: (p) => p === "/dashboard/account" || p.startsWith("/dashboard/account/"),
    permissions: [],
    authOnly: true,
  },
  {
    match: (p) => p === "/dashboard/inventory-categories",
    permissions: ["categories:view"],
  },
  { match: (p) => p === "/pos" || p.startsWith("/pos/"), permissions: ["pos:access"], featureKey: "pos" },
  { match: (p) => p === "/dashboard", permissions: ["dashboard:view"] },
  { match: (p) => p === "/dashboard/orders" || p.startsWith("/dashboard/orders/"), permissions: ["orders:view"] },
  {
    match: (p) => p === "/dashboard/inventory" || p.startsWith("/dashboard/inventory/"),
    permissions: ["inventory:view"],
    featureKey: "inventory",
  },
  { match: (p) => p === "/dashboard/menu" || p.startsWith("/dashboard/menu/"), permissions: ["menu:view"] },
  {
    match: (p) => p === "/dashboard/categories" || p.startsWith("/dashboard/categories/"),
    permissions: ["categories:view"],
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

export function canAccessNavItem(item: NavItem, ctx: RouteAccessContext): boolean {
  if (item.permissionsAny?.length) {
    if (!hasAnyPermissionInList(ctx.permissions, item.permissionsAny)) {
      return false;
    }
  } else if (item.permission && !hasAnyPermissionInList(ctx.permissions, [item.permission])) {
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

export function canAccessRouteRule(rule: RouteAccessRule, ctx: RouteAccessContext): boolean {
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
  if (isLiteBlockedPath(pathname) && !isSuperAdmin(ctx.role)) {
    return false;
  }
  const rule = matchRouteAccessRule(pathname);
  if (!rule) return !isLiteBlockedPath(pathname);
  return canAccessRouteRule(rule, ctx);
}

export function getFirstAccessibleNavHref(
  ctx: RouteAccessContext,
  options?: { exclude?: string[] },
): string {
  const exclude = new Set(options?.exclude ?? []);
  const items = [...DASHBOARD_NAVIGATION, ...DASHBOARD_BOTTOM_NAVIGATION];
  for (const item of items) {
    if (exclude.has(item.href)) continue;
    if (canAccessNavItem(item, ctx)) return item.href;
  }
  return "/dashboard/account";
}

export function resolveAppBackHref(appPath: string, ctx: RouteAccessContext): string {
  return getFirstAccessibleNavHref(ctx, { exclude: [appPath] });
}

export function filterNavItems(items: NavItem[], ctx: RouteAccessContext): NavItem[] {
  return items.filter((item) => canAccessNavItem(item, ctx));
}

export function resolveSafeLandingHref(ctx: RouteAccessContext): string {
  if (hasPermissionInList(ctx.permissions, "dashboard:view")) return "/dashboard";
  if (hasPermissionInList(ctx.permissions, "pos:access")) return "/pos";
  if (hasPermissionInList(ctx.permissions, "orders:view")) return "/dashboard/orders";
  return getFirstAccessibleNavHref(ctx);
}

/** Mobile bottom nav primary items */
export const MOBILE_PRIMARY_NAV: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { name: "POS", href: "/pos", icon: Monitor, permission: "pos:access", featureKey: "pos" },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart, permission: "orders:view" },
];

/** Items shown in mobile "More" sheet */
export const MOBILE_MORE_NAV: NavItem[] = [
  { name: "Products", href: "/dashboard/menu", icon: UtensilsCrossed, permission: "menu:view" },
  { name: "Categories", href: "/dashboard/categories", icon: Tag, permission: "categories:view" },
  {
    name: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    permission: "inventory:view",
    featureKey: "inventory",
  },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, permission: "settings:view" },
  { name: "User Management", href: "/dashboard/users", icon: UserCog, permission: "users:view" },
];
