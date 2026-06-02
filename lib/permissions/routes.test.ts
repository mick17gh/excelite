import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  filterNavItems,
  DASHBOARD_NAVIGATION,
  isAuthOnlyPath,
  resolveSafeLandingHref,
} from "./routes";
import type { Permission } from "./types";
import type { RouteAccessContext } from "./routes";

function ctx(permissions: Permission[], role: RouteAccessContext["role"] = "STAFF"): RouteAccessContext {
  return {
    permissions,
    orgTier: "ENTERPRISE",
    tableManagementEnabled: true,
    role,
  };
}

describe("permission routes", () => {
  it("treats account as auth-only", () => {
    expect(isAuthOnlyPath("/dashboard/account")).toBe(true);
    expect(
      canAccessPath("/dashboard/account", ctx(["pos:access"])),
    ).toBe(true);
  });

  it("blocks dashboard home without dashboard:view", () => {
    expect(
      canAccessPath("/dashboard", ctx(["pos:access", "orders:view"])),
    ).toBe(false);
  });

  it("allows orders without dashboard:view", () => {
    expect(
      canAccessPath("/dashboard/orders", ctx(["orders:view"])),
    ).toBe(true);
  });

  it("hides dashboard nav item when permission removed", () => {
    const items = filterNavItems(DASHBOARD_NAVIGATION, ctx(["orders:view", "pos:access"]));
    expect(items.some((i) => i.href === "/dashboard")).toBe(false);
    expect(items.some((i) => i.href === "/dashboard/orders")).toBe(true);
  });

  it("lands staff without dashboard on pos when available", () => {
    expect(resolveSafeLandingHref(ctx(["pos:access", "orders:view"]))).toBe("/pos");
  });

  it("falls back to account when no nav permissions", () => {
    expect(resolveSafeLandingHref(ctx([]))).toBe("/dashboard/account");
  });
});
