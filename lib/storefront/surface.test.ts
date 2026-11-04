import { afterEach, describe, expect, it, vi } from "vitest";
import { isHideLandingPage, isStorefrontOnlyPath, isStorefrontSurface } from "./surface";

describe("storefront surface helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("detects hide landing", () => {
    vi.stubEnv("NEXT_PUBLIC_HIDE_LANDING_PAGE", "true");
    expect(isHideLandingPage()).toBe(true);
  });

  it("storefront surface requires surface flag and not hide landing", () => {
    vi.stubEnv("NEXT_PUBLIC_HIDE_LANDING_PAGE", "false");
    vi.stubEnv("NEXT_PUBLIC_APP_SURFACE", "storefront");
    expect(isStorefrontSurface()).toBe(true);

    vi.stubEnv("NEXT_PUBLIC_HIDE_LANDING_PAGE", "true");
    expect(isStorefrontSurface()).toBe(false);
  });

  it("identifies storefront-only paths", () => {
    expect(isStorefrontOnlyPath("/checkout")).toBe(true);
    expect(isStorefrontOnlyPath("/order/ABC")).toBe(true);
    expect(isStorefrontOnlyPath("/track")).toBe(true);
    expect(isStorefrontOnlyPath("/login")).toBe(false);
  });
});
