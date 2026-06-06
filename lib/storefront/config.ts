import { db } from "@/lib/db";
import { hasFeature, isSuperAdmin } from "@/lib/tier-config";
import { normalizeTemplateId, STOREFRONT_TEMPLATES, type StorefrontTemplateId } from "@/lib/storefront/templates";
import { isPaystackStorefrontEnabledForOrg } from "@/lib/paystack/credentials";
import { getStoreAvailabilityByHours, type BusinessHours } from "@/lib/storefront/hours";
import { getPrimaryBannerUrl, resolveStoreBanners, type StoreBanner } from "@/lib/storefront/banners";

export type { StoreBanner };

export type PublicStoreConfig = {
  organizationId: string;
  store: {
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    /** @deprecated Use banners[0]?.url */
    bannerUrl: string | null;
    banners: StoreBanner[];
  };
  template: {
    id: StorefrontTemplateId;
    available: readonly string[];
  };
  status: {
    enabled: boolean;
    isOpenNow: boolean;
    closedReason: string | null;
  };
  checkout: {
    currency: "GHS" | "NGN";
    minimumOrderAmount: number;
    deliveryFee: number;
    taxRate: number;
    taxInclusive: boolean;
  };
  features: {
    deliveryEnabled: boolean;
    pickupEnabled: boolean;
    cashEnabled: boolean;
    paystackEnabled: boolean;
  };
  operations: {
    deliveryRadiusKm: number;
    estimatedPrepTimeMinutes: number;
  };
  contact: {
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    address: string | null;
  };
  social: {
    facebook: string | null;
    instagram: string | null;
  };
  hours: {
    timezone: string;
    description: string;
    weekly: BusinessHours;
  };
  theme: Record<string, unknown> | null;
  branches: { id: string; name: string; code: string }[];
};

export async function getOrganizationForStorefront(organizationId: string) {
  return db.organization.findUnique({
    where: { id: organizationId },
    include: {
      branches: {
        where: { deletedAt: null, isActive: true, onlineStoreVisible: true },
        select: { id: true, name: true, code: true, currency: true, taxEnabled: true, taxRate: true, taxInclusive: true, address: true, city: true, country: true },
      },
    },
  });
}

export function isStorefrontEnabledForOrg(
  org: Awaited<ReturnType<typeof getOrganizationForStorefront>>,
  role?: string | null
): boolean {
  if (!org) return false;
  if (isSuperAdmin(role as never)) return true;
  if (!hasFeature(org.tier, "onlineOrdering")) return false;
  return org.onlineOrderingEnabled;
}

export function buildPublicStoreConfig(
  org: NonNullable<Awaited<ReturnType<typeof getOrganizationForStorefront>>>
): PublicStoreConfig {
  const envOverride = process.env.NEXT_PUBLIC_STOREFRONT_TEMPLATE_OVERRIDE;
  const templateId = normalizeTemplateId(envOverride || org.storefrontTemplateId || "classic");

  const businessHours = (org.businessHours as BusinessHours | null) ?? null;
  const timeZone = org.storeTimezone || "Africa/Accra";
  const availability = getStoreAvailabilityByHours(businessHours, timeZone);
  const firstBranch = org.branches[0];
  const currency = ((firstBranch?.currency === "NGN" ? "NGN" : "GHS") as "GHS" | "NGN");
  const taxRate = firstBranch?.taxEnabled ? Number(firstBranch.taxRate || 0) / 100 : 0;
  const hoursDescription = Object.keys(businessHours || {}).length > 0
    ? "See weekly schedule"
    : "Always open";
  const rawTheme = (org.storeTheme as Record<string, unknown> | null) ?? {};
  const contactAddress = firstBranch
    ? [firstBranch.address, firstBranch.city, firstBranch.country].filter(Boolean).join(", ")
    : null;
  const banners = resolveStoreBanners(org.storeBanners, org.storeBannerUrl);

  return {
    organizationId: org.id,
    store: {
      name: org.storeName || org.name,
      slug: org.storeSlug || "",
      description: org.storeDescription,
      logoUrl: org.storeLogoUrl,
      bannerUrl: getPrimaryBannerUrl(banners),
      banners,
    },
    template: {
      id: templateId,
      available: STOREFRONT_TEMPLATES,
    },
    status: {
      enabled: org.onlineOrderingEnabled,
      isOpenNow: availability.isOpenNow,
      closedReason: org.onlineOrderingEnabled
        ? (availability.isOpenNow ? null : (availability.nextOpenAt ? `Opens ${availability.nextOpenAt}` : (org.closureMessage || "Temporarily closed")))
        : (org.closureMessage || "Store temporarily closed"),
    },
    checkout: {
      currency,
      minimumOrderAmount: org.minOrderAmount ? Number(org.minOrderAmount) : 0,
      deliveryFee: org.deliveryFeeFlat ? Number(org.deliveryFeeFlat) : 0,
      taxRate,
      taxInclusive: firstBranch?.taxInclusive ?? false,
    },
    features: {
      deliveryEnabled: org.deliveryEnabled,
      pickupEnabled: org.pickupEnabled,
      cashEnabled: true,
      paystackEnabled: isPaystackStorefrontEnabledForOrg(org),
    },
    operations: {
      deliveryRadiusKm: org.deliveryRadius ? Number(org.deliveryRadius) : 0,
      estimatedPrepTimeMinutes: org.estimatedPrepTime || 0,
    },
    contact: {
      email: org.contactEmail,
      phone: org.contactPhone,
      whatsapp: org.whatsappNumber,
      address: contactAddress,
    },
    social: {
      facebook: org.facebookUrl,
      instagram: org.instagramUrl,
    },
    hours: {
      timezone: timeZone,
      description: hoursDescription,
      weekly: businessHours || {},
    },
    theme: {
      primary: rawTheme.primary || "#0ea5e9",
      secondary: rawTheme.secondary || "#22c55e",
      accent: rawTheme.accent || "#f97316",
      background: rawTheme.background || "#ffffff",
      foreground: rawTheme.foreground || "#0f172a",
      radius: rawTheme.radius || "0.75rem",
      fontFamily: rawTheme.fontFamily || "Inter, sans-serif",
    },
    branches: org.branches.map((branch) => ({ id: branch.id, name: branch.name, code: branch.code })),
  };
}

export function getStorefrontAvailability(org: NonNullable<Awaited<ReturnType<typeof getOrganizationForStorefront>>>) {
  const businessHours = (org.businessHours as BusinessHours | null) ?? null;
  const timeZone = org.storeTimezone || "Africa/Accra";
  const availability = getStoreAvailabilityByHours(businessHours, timeZone);
  return {
    isOpenNow: availability.isOpenNow,
    nextOpenAt: availability.nextOpenAt,
    closedReason: org.closureMessage || "Store is currently outside business hours",
  };
}

export function resolveAllowedStorefrontOrigins(orgConfig: PublicStoreConfig): string[] {
  const env = process.env.STOREFRONT_ALLOWED_ORIGINS;
  if (env) {
    return env.split(",").map((part) => part.trim()).filter(Boolean);
  }
  const slug = orgConfig.store.slug?.trim();
  if (!slug) return [];
  return [`https://${slug}.servstack.app`];
}

export { getPaystackSecretForOrganization } from "@/lib/paystack/credentials";
