import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPaystackDashboardEnabledForOrg,
  isPaystackStorefrontEnabledForOrg,
  type PaystackOrgFlags,
} from "./credentials";

function org(overrides: Partial<PaystackOrgFlags> = {}): PaystackOrgFlags {
  return {
    paystackEnabled: false,
    paystackDashboardEnabled: false,
    features: null,
    ...overrides,
  };
}

describe("paystack credentials", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("enables storefront only when storefront flag is on and env is configured", () => {
    vi.stubEnv("PAYSTACK_PUBLIC_KEY", "pk_test");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test");

    expect(isPaystackStorefrontEnabledForOrg(org({ paystackEnabled: true }))).toBe(true);
    expect(isPaystackDashboardEnabledForOrg(org({ paystackEnabled: true }))).toBe(false);
  });

  it("enables dashboard only when dashboard flag is on and env is configured", () => {
    vi.stubEnv("PAYSTACK_PUBLIC_KEY", "pk_test");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test");

    expect(isPaystackDashboardEnabledForOrg(org({ paystackDashboardEnabled: true }))).toBe(true);
    expect(isPaystackStorefrontEnabledForOrg(org({ paystackDashboardEnabled: true }))).toBe(false);
  });

  it("returns false for both when neither flag is set", () => {
    vi.stubEnv("PAYSTACK_PUBLIC_KEY", "pk_test");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test");

    expect(isPaystackStorefrontEnabledForOrg(org())).toBe(false);
    expect(isPaystackDashboardEnabledForOrg(org())).toBe(false);
  });

  it("returns false when env keys are missing even if flags are on", () => {
    expect(isPaystackStorefrontEnabledForOrg(org({ paystackEnabled: true }))).toBe(false);
    expect(isPaystackDashboardEnabledForOrg(org({ paystackDashboardEnabled: true }))).toBe(false);
  });

  it("uses legacy features.paystackEnabled for storefront only", () => {
    vi.stubEnv("PAYSTACK_PUBLIC_KEY", "pk_test");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test");

    const legacy = org({ features: { paystackEnabled: true } });
    expect(isPaystackStorefrontEnabledForOrg(legacy)).toBe(true);
    expect(isPaystackDashboardEnabledForOrg(legacy)).toBe(false);
  });

  it("uses legacy features.paystackDashboardEnabled for dashboard only", () => {
    vi.stubEnv("PAYSTACK_PUBLIC_KEY", "pk_test");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test");

    const legacy = org({ features: { paystackDashboardEnabled: true } });
    expect(isPaystackDashboardEnabledForOrg(legacy)).toBe(true);
    expect(isPaystackStorefrontEnabledForOrg(legacy)).toBe(false);
  });
});
