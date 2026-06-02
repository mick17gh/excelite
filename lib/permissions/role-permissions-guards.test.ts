import { describe, expect, it } from "vitest";
import { PLATFORM_ONLY_PERMISSIONS } from "./types";

describe("platform-only permissions", () => {
  it("includes subscriptions:manage as platform-only", () => {
    expect(PLATFORM_ONLY_PERMISSIONS).toContain("subscriptions:manage");
  });

  it("roles:manage is not platform-only", () => {
    expect(PLATFORM_ONLY_PERMISSIONS).not.toContain("roles:manage");
  });
});
