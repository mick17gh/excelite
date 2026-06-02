import { describe, expect, it } from "vitest";
import {
  hasAllPermissionsInList,
  hasAnyPermissionInList,
  hasPermissionInList,
} from "./check-list";
import type { Permission } from "./types";

const samplePerms: Permission[] = [
  "dashboard:view",
  "pos:access",
  "roles:view",
  "roles:manage",
];

describe("hasPermissionInList", () => {
  it("returns true when permission is in list", () => {
    expect(hasPermissionInList(samplePerms, "pos:access")).toBe(true);
  });

  it("returns false when permission is missing", () => {
    expect(hasPermissionInList(samplePerms, "users:delete")).toBe(false);
  });
});

describe("hasAnyPermissionInList", () => {
  it("matches any of the required permissions", () => {
    expect(
      hasAnyPermissionInList(samplePerms, ["users:delete", "roles:manage"]),
    ).toBe(true);
  });
});

describe("hasAllPermissionsInList", () => {
  it("requires all permissions", () => {
    expect(hasAllPermissionsInList(samplePerms, ["roles:view", "roles:manage"])).toBe(
      true,
    );
    expect(
      hasAllPermissionsInList(samplePerms, ["roles:view", "subscriptions:manage"]),
    ).toBe(false);
  });
});
