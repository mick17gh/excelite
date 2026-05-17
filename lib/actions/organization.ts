"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SubscriptionTier, SubscriptionStatus, Role } from "@/lib/generated/prisma/client";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { hasFeature, TIER_CONFIG } from "@/lib/tier-config";
import { normalizeTemplateId, STOREFRONT_TEMPLATES } from "@/lib/storefront/templates";
import { buildPublicStoreConfig, getOrganizationForStorefront, type PublicStoreConfig } from "@/lib/storefront/config";
import {
  normalizeBannersForSave,
  resolveStoreBanners,
  type StoreBanner,
  validateStoreBannersForSave,
} from "@/lib/storefront/banners";

export interface UpdateOrganizationInput {
  id: string;
  name?: string;
  tier?: SubscriptionTier;
  maxBranches?: number;
  maxUsers?: number;
  maxMenuItems?: number | null;
  features?: Record<string, boolean>;
  onlineOrderingEnabled?: boolean;
  storeSlug?: string | null;
  storeName?: string | null;
  storeDescription?: string | null;
  storeLogoUrl?: string | null;
  storeBannerUrl?: string | null;
  storeBanners?: StoreBanner[] | null;
  storeTheme?: Record<string, unknown> | null;
  businessHours?: Record<string, { open: string; close: string; closed?: boolean }> | null;
  storeTimezone?: string | null;
  storefrontTemplateId?: string | null;
  allowedStorefrontTemplates?: string[] | null;
  closureMessage?: string | null;
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  minOrderAmount?: number | null;
  deliveryFeeFlat?: number | null;
  deliveryRadius?: number | null;
  estimatedPrepTime?: number | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  whatsappNumber?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  paystackEnabled?: boolean;
}

export async function getOrganization(id?: string) {
  try {
    const where = id ? { id } : {};
    const org = await db.organization.findFirst({
      where,
      include: {
        _count: { select: { users: true, branches: true, warehouses: true } },
        subscription: {
          include: {
            payments: { orderBy: { createdAt: "desc" }, take: 10 },
          },
        },
      },
    });

    if (!org) return { data: null };

    return {
      data: {
        id: org.id,
        name: org.name,
        tier: org.tier,
        status: org.status,
        maxBranches: org.maxBranches,
        maxUsers: org.maxUsers,
        maxMenuItems: org.maxMenuItems,
        features: org.features as Record<string, boolean> | null,
        onlineOrderingEnabled: org.onlineOrderingEnabled,
        storeSlug: org.storeSlug,
        storeName: org.storeName,
        storeDescription: org.storeDescription,
        storeLogoUrl: org.storeLogoUrl,
        storeBannerUrl: org.storeBannerUrl,
        storeBanners: org.storeBanners,
        storeTheme: org.storeTheme as Record<string, unknown> | null,
        storefrontTemplateId: org.storefrontTemplateId || "classic",
        businessHours: org.businessHours as Record<string, { open: string; close: string; closed?: boolean }> | null,
        storeTimezone: org.storeTimezone || "Africa/Accra",
        allowedStorefrontTemplates: (org.allowedStorefrontTemplates as string[] | null) ?? [...STOREFRONT_TEMPLATES],
        closureMessage: org.closureMessage,
        deliveryEnabled: org.deliveryEnabled,
        pickupEnabled: org.pickupEnabled,
        minOrderAmount: org.minOrderAmount ? Number(org.minOrderAmount) : null,
        deliveryFeeFlat: org.deliveryFeeFlat ? Number(org.deliveryFeeFlat) : null,
        deliveryRadius: org.deliveryRadius ? Number(org.deliveryRadius) : null,
        estimatedPrepTime: org.estimatedPrepTime,
        contactEmail: org.contactEmail,
        contactPhone: org.contactPhone,
        whatsappNumber: org.whatsappNumber,
        facebookUrl: org.facebookUrl,
        instagramUrl: org.instagramUrl,
        paystackEnabled: org.paystackEnabled || (org.features as Record<string, unknown> | null)?.paystackEnabled === true,
        trialEndsAt: org.trialEndsAt?.toISOString() || null,
        subscriptionEndsAt: org.subscriptionEndsAt?.toISOString() || null,
        userCount: org._count.users,
        branchCount: org._count.branches,
        warehouseCount: org._count.warehouses,
        subscription: org.subscription
          ? {
              id: org.subscription.id,
              tier: org.subscription.tier,
              status: org.subscription.status,
              amount: Number(org.subscription.amount),
              currency: org.subscription.currency,
              billingCycle: org.subscription.billingCycle,
              nextBillingDate: org.subscription.nextBillingDate?.toISOString() || null,
              canceledAt: org.subscription.canceledAt?.toISOString() || null,
              payments: org.subscription.payments.map((p) => ({
                id: p.id,
                amount: Number(p.amount),
                currency: p.currency,
                status: p.status,
                paymentMethod: p.paymentMethod,
                reference: p.reference,
                paidAt: p.paidAt?.toISOString() || null,
                createdAt: p.createdAt.toISOString(),
              })),
            }
          : null,
        createdAt: org.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[getOrganization] Error:", error);
    return { data: null };
  }
}

export async function updateOrganization(input: UpdateOrganizationInput) {
  try {
    const existingOrg = await db.organization.findUnique({
      where: { id: input.id },
      select: { tier: true, features: true },
    });
    if (!existingOrg) {
      return { error: "Organization not found" };
    }

    // Check if user is trying to change tier
    if (input.tier !== undefined) {
      const session = await auth.api.getSession({ headers: await import("next/headers").then(m => m.headers()) });
      const user = session?.user;
      
      if (!user || !hasPermission(user.role as Role, "subscriptions:manage")) {
        return { error: "You don't have permission to change subscription tiers" };
      }
    }

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.tier !== undefined) {
      data.tier = input.tier;
      // Automatically update limits when tier changes
      const tierLimits = TIER_CONFIG[input.tier];
      data.maxBranches = tierLimits.maxBranches === Infinity ? 999 : tierLimits.maxBranches;
      data.maxUsers = tierLimits.maxUsers === Infinity ? 999 : tierLimits.maxUsers;
      data.maxMenuItems = tierLimits.maxMenuItems;
    }
    if (input.maxBranches !== undefined) data.maxBranches = input.maxBranches;
    if (input.maxUsers !== undefined) data.maxUsers = input.maxUsers;
    if (input.maxMenuItems !== undefined) data.maxMenuItems = input.maxMenuItems;
    if (input.features !== undefined) data.features = input.features;
    if (input.onlineOrderingEnabled && !hasFeature(existingOrg.tier, "onlineOrdering")) {
      return { error: "Current subscription tier does not support online ordering" };
    }
    if (input.onlineOrderingEnabled !== undefined) data.onlineOrderingEnabled = input.onlineOrderingEnabled;
    if (input.storeSlug !== undefined) data.storeSlug = input.storeSlug;
    if (input.storeName !== undefined) data.storeName = input.storeName;
    if (input.storeDescription !== undefined) data.storeDescription = input.storeDescription;
    if (input.storeLogoUrl !== undefined) data.storeLogoUrl = input.storeLogoUrl;
    if (input.storeBannerUrl !== undefined) data.storeBannerUrl = input.storeBannerUrl;
    if (input.storeBanners !== undefined) {
      const normalizedBanners =
        input.storeBanners === null ? [] : normalizeBannersForSave(input.storeBanners);
      const validationError = validateStoreBannersForSave(normalizedBanners);
      if (validationError) return { error: validationError };
      data.storeBanners = normalizedBanners;
      data.storeBannerUrl = normalizedBanners[0]?.url ?? null;
    }
    if (input.storeTheme !== undefined) data.storeTheme = input.storeTheme;
    if (input.businessHours !== undefined) data.businessHours = input.businessHours;
    if (input.storeTimezone !== undefined) data.storeTimezone = input.storeTimezone;
    if (input.storefrontTemplateId !== undefined) data.storefrontTemplateId = normalizeTemplateId(input.storefrontTemplateId);
    if (input.allowedStorefrontTemplates !== undefined) data.allowedStorefrontTemplates = input.allowedStorefrontTemplates;
    if (input.closureMessage !== undefined) data.closureMessage = input.closureMessage;
    if (input.deliveryEnabled !== undefined) data.deliveryEnabled = input.deliveryEnabled;
    if (input.pickupEnabled !== undefined) data.pickupEnabled = input.pickupEnabled;
    if (input.minOrderAmount !== undefined) data.minOrderAmount = input.minOrderAmount;
    if (input.deliveryFeeFlat !== undefined) data.deliveryFeeFlat = input.deliveryFeeFlat;
    if (input.deliveryRadius !== undefined) data.deliveryRadius = input.deliveryRadius;
    if (input.estimatedPrepTime !== undefined) data.estimatedPrepTime = input.estimatedPrepTime;
    if (input.contactEmail !== undefined) data.contactEmail = input.contactEmail;
    if (input.contactPhone !== undefined) data.contactPhone = input.contactPhone;
    if (input.whatsappNumber !== undefined) data.whatsappNumber = input.whatsappNumber;
    if (input.facebookUrl !== undefined) data.facebookUrl = input.facebookUrl;
    if (input.instagramUrl !== undefined) data.instagramUrl = input.instagramUrl;
    if (input.paystackEnabled !== undefined) {
      data.paystackEnabled = input.paystackEnabled;
      const currentFeatures = (existingOrg.features as Record<string, unknown> | null) || {};
      data.features = {
        ...currentFeatures,
        ...(input.features || {}),
        paystackEnabled: input.paystackEnabled,
      };
    }
    const org = await db.organization.update({
      where: { id: input.id },
      data,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/branches");
    return {
      data: {
        ...JSON.parse(JSON.stringify(org)),
        minOrderAmount: org.minOrderAmount ? Number(org.minOrderAmount) : null,
        deliveryFeeFlat: org.deliveryFeeFlat ? Number(org.deliveryFeeFlat) : null,
        deliveryRadius: org.deliveryRadius ? Number(org.deliveryRadius) : null,
      },
    };
  } catch (error) {
    console.error("[updateOrganization] Error:", error);
    return { error: "Failed to update organization" };
  }
}

export async function getOnlineStoreSettings(organizationId: string) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
  });
  if (!org) return { error: "Organization not found" };

  return {
    data: {
      onlineOrderingEnabled: org.onlineOrderingEnabled,
      storeSlug: org.storeSlug,
      storeName: org.storeName,
      storeDescription: org.storeDescription,
      storeLogoUrl: org.storeLogoUrl,
      storeBannerUrl: org.storeBannerUrl,
      storeBanners: resolveStoreBanners(org.storeBanners, org.storeBannerUrl),
      storefrontTemplateId: normalizeTemplateId(org.storefrontTemplateId),
      businessHours: org.businessHours as Record<string, { open: string; close: string; closed?: boolean }> | null,
      storeTimezone: org.storeTimezone || "Africa/Accra",
      allowedStorefrontTemplates: (org.allowedStorefrontTemplates as string[] | null) ?? [...STOREFRONT_TEMPLATES],
      closureMessage: org.closureMessage,
      deliveryEnabled: org.deliveryEnabled,
      pickupEnabled: org.pickupEnabled,
      minOrderAmount: org.minOrderAmount ? Number(org.minOrderAmount) : null,
      deliveryFeeFlat: org.deliveryFeeFlat ? Number(org.deliveryFeeFlat) : null,
      deliveryRadius: org.deliveryRadius ? Number(org.deliveryRadius) : null,
      estimatedPrepTime: org.estimatedPrepTime,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      whatsappNumber: org.whatsappNumber,
      facebookUrl: org.facebookUrl,
      instagramUrl: org.instagramUrl,
      paystackEnabled: org.paystackEnabled || (org.features as Record<string, unknown> | null)?.paystackEnabled === true,
      storeTheme: org.storeTheme as Record<string, unknown> | null,
    },
  };
}

export async function generateStorefrontConfig(organizationId: string) {
  const org = await getOrganizationForStorefront(organizationId);
  if (!org) return { error: "Organization not found" };
  const apiBaseUrl = (process.env.NEXT_PUBLIC_SERVSTACK_API_URL || "").replace(/\/$/, "");
  const publicEndpoints = apiBaseUrl
    ? {
        config: `${apiBaseUrl}/api/public/store/${organizationId}/config`,
        menu: `${apiBaseUrl}/api/public/store/${organizationId}/menu`,
        branches: `${apiBaseUrl}/api/public/store/${organizationId}/branches`,
        orders: `${apiBaseUrl}/api/public/store/${organizationId}/orders`,
        trackOrder: `${apiBaseUrl}/api/public/orders/{orderNumber}/track?phone={phone}`,
      }
    : null;
  const canonical = buildPublicStoreConfig(org);

  return {
    data: {
      data: canonical,
      meta: {
        version: "1.3",
        apiBaseUrl,
        publicEndpoints,
        notes: {
          menu: "Fetch live menu via GET .../menu (includes optionGroups for variants).",
          orders: "POST items[].menuItemOptionIds with selected option ids from menu.optionGroups[].options[].id",
        },
      },
    },
  };
}

export type StorefrontConfigBundle = {
  data: PublicStoreConfig;
  meta: {
    version: string;
    apiBaseUrl: string;
    publicEndpoints: Record<string, string> | null;
    notes?: Record<string, string>;
  };
};

export async function createOrganization(name: string, tier: SubscriptionTier = "FREE") {
  try {
    const tierLimits = TIER_CONFIG[tier];
    const org = await db.organization.create({
      data: {
        name,
        tier,
        status: "ACTIVE",
        maxBranches: tierLimits.maxBranches === Infinity ? 999 : tierLimits.maxBranches,
        maxUsers: tierLimits.maxUsers === Infinity ? 999 : tierLimits.maxUsers,
        maxMenuItems: tierLimits.maxMenuItems,
      },
    });

    revalidatePath("/dashboard/settings");
    return { data: org };
  } catch (error) {
    console.error("[createOrganization] Error:", error);
    return { error: "Failed to create organization" };
  }
}

export async function getSubscriptionPayments(organizationId: string) {
  try {
    const subscription = await db.subscription.findUnique({
      where: { organizationId },
      include: {
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!subscription) return { data: [] };

    return {
      data: subscription.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        paymentMethod: p.paymentMethod,
        reference: p.reference,
        paidAt: p.paidAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[getSubscriptionPayments] Error:", error);
    return { data: [] };
  }
}

export async function getAllOrganizations() {
  try {
    // Check if user has permission
    const session = await auth.api.getSession({ headers: await import("next/headers").then(m => m.headers()) });
    const user = session?.user;
    
    if (!user || !hasPermission(user.role as Role, "subscriptions:manage")) {
      return { error: "You don't have permission to view all organizations" };
    }

    const organizations = await db.organization.findMany({
      include: {
        _count: { 
          select: { 
            users: true, 
            branches: true, 
            warehouses: true 
          } 
        },
        subscription: {
          select: {
            tier: true,
            status: true,
            amount: true,
            currency: true,
            nextBillingDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        tier: org.tier,
        status: org.status,
        maxBranches: org.maxBranches,
        maxUsers: org.maxUsers,
        userCount: org._count.users,
        branchCount: org._count.branches,
        warehouseCount: org._count.warehouses,
        subscription: org.subscription ? {
          tier: org.subscription.tier,
          status: org.subscription.status,
          amount: Number(org.subscription.amount),
          currency: org.subscription.currency,
          nextBillingDate: org.subscription.nextBillingDate?.toISOString() || null,
        } : null,
        createdAt: org.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[getAllOrganizations] Error:", error);
    return { error: "Failed to fetch organizations" };
  }
}
