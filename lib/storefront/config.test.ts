import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import {
  branchTaxRateDecimal,
  buildPublicStoreConfig,
  findPublicStoreBranch,
  isStorefrontEnabledForOrg,
  toPublicStoreBranch,
  type PublicStoreConfig,
} from "./config";

describe("storefront branch tax helpers", () => {
  it("converts enabled branch tax rate to decimal", () => {
    expect(branchTaxRateDecimal({ taxEnabled: true, taxRate: 12.5 })).toBe(0.125);
  });

  it("returns zero tax rate when tax is disabled", () => {
    expect(branchTaxRateDecimal({ taxEnabled: false, taxRate: 20 })).toBe(0);
  });

  it("maps branch rows to public branch config", () => {
    expect(
      toPublicStoreBranch({
        id: "b1",
        name: "Main",
        code: "MAIN",
        currency: "GHS",
        taxEnabled: true,
        taxRate: 20,
        taxInclusive: true,
        address: null,
        city: null,
        country: null,
      })
    ).toEqual({
      id: "b1",
      name: "Main",
      code: "MAIN",
      currency: "GHS",
      taxRate: 0.2,
      taxInclusive: true,
      paystackConfigured: false,
    });
  });

  it("sets paystackConfigured when branch has active subaccount", () => {
    expect(
      toPublicStoreBranch(
        {
          id: "b1",
          name: "Main",
          code: "MAIN",
          currency: "GHS",
          taxEnabled: false,
          taxRate: 0,
          taxInclusive: false,
          address: null,
          city: null,
          country: null,
          paystackSubaccountCode: "ACCT_test",
          paystackSubaccountActive: true,
        },
        { includePaystackStatus: true },
      ),
    ).toMatchObject({ paystackConfigured: true });
  });

  it("finds branch tax settings by id", () => {
    const config: Pick<PublicStoreConfig, "branches"> = {
      branches: [
        {
          id: "b1",
          name: "A",
          code: "A",
          currency: "GHS",
          taxRate: 0.125,
          taxInclusive: false,
          paystackConfigured: false,
        },
        {
          id: "b2",
          name: "B",
          code: "B",
          currency: "GHS",
          taxRate: 0.2,
          taxInclusive: true,
          paystackConfigured: false,
        },
      ],
    };

    expect(findPublicStoreBranch(config, "b2")).toMatchObject({
      taxRate: 0.2,
      taxInclusive: true,
    });
    expect(findPublicStoreBranch(config, "missing")).toBeUndefined();
  });
});

describe("buildPublicStoreConfig", () => {
  it("exposes per-branch tax on branches and keeps checkout fallback on first branch", () => {
    const config = buildPublicStoreConfig({
      id: "org1",
      name: "Test Org",
      tier: "PRO",
      storefrontPlatformEnabled: true,
      onlineOrderingEnabled: true,
      cashCheckoutEnabled: true,
      whatsappOrderingEnabled: false,
      storefrontTemplateId: "classic",
      storeName: null,
      storeSlug: "test",
      storeDescription: null,
      storeLogoUrl: null,
      storeBannerUrl: null,
      storeBanners: null,
      storeTimezone: "Africa/Accra",
      businessHours: null,
      minOrderAmount: null,
      deliveryFeeFlat: null,
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryRadius: null,
      estimatedPrepTime: null,
      contactEmail: null,
      contactPhone: null,
      whatsappNumber: null,
      facebookUrl: null,
      instagramUrl: null,
      closureMessage: null,
      storeTheme: null,
      paystackEnabled: false,
      paystackDashboardEnabled: false,
      features: null,
      branches: [
        {
          id: "b-exclusive",
          name: "Alpha",
          code: "A",
          currency: "GHS",
          taxEnabled: true,
          taxRate: 12.5,
          taxInclusive: false,
          address: "1 Main St",
          city: "Accra",
          country: "GH",
        },
        {
          id: "b-inclusive",
          name: "Beta",
          code: "B",
          currency: "GHS",
          taxEnabled: true,
          taxRate: 20,
          taxInclusive: true,
          address: null,
          city: null,
          country: null,
        },
      ],
    } as never);

    expect(config.branches).toEqual([
      {
        id: "b-exclusive",
        name: "Alpha",
        code: "A",
        currency: "GHS",
        taxRate: 0.125,
        taxInclusive: false,
        paystackConfigured: false,
      },
      {
        id: "b-inclusive",
        name: "Beta",
        code: "B",
        currency: "GHS",
        taxRate: 0.2,
        taxInclusive: true,
        paystackConfigured: false,
      },
    ]);
    expect(config.checkout.taxRate).toBe(0.125);
    expect(config.checkout.taxInclusive).toBe(false);
    expect(config.features.cashEnabled).toBe(true);
    expect(config.features.whatsappOrderingEnabled).toBe(false);
    expect(config.status.enabled).toBe(true);
  });

  it("requires platform entitlement to enable storefront", () => {
    const disabled = {
      storefrontPlatformEnabled: false,
      onlineOrderingEnabled: true,
    } as Parameters<typeof isStorefrontEnabledForOrg>[0];
    const enabled = {
      storefrontPlatformEnabled: true,
      onlineOrderingEnabled: true,
    } as Parameters<typeof isStorefrontEnabledForOrg>[0];
    const unpublished = {
      storefrontPlatformEnabled: true,
      onlineOrderingEnabled: false,
    } as Parameters<typeof isStorefrontEnabledForOrg>[0];

    expect(isStorefrontEnabledForOrg(disabled)).toBe(false);
    expect(isStorefrontEnabledForOrg(enabled)).toBe(true);
    expect(isStorefrontEnabledForOrg(unpublished)).toBe(false);
  });
});
