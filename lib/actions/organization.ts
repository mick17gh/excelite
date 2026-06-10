"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SubscriptionTier, SubscriptionStatus, Role } from "@/lib/generated/prisma/client";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/require";
import { hasFeature, TIER_CONFIG } from "@/lib/tier-config";
import { normalizeTemplateId, STOREFRONT_TEMPLATES } from "@/lib/storefront/templates";
import { buildPublicStoreConfig, getOrganizationForStorefront, type PublicStoreConfig } from "@/lib/storefront/config";
import {
  normalizeBannersForSave,
  resolveStoreBanners,
  type StoreBanner,
  validateStoreBannersForSave,
} from "@/lib/storefront/banners";
import { normalizeStorefrontUrl } from "@/lib/storefront/url";
import { setTableServiceBranches } from "@/lib/features/table-management";
import { headers } from "next/headers";

function isDynamicServerUsageError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = "digest" in error ? String((error as { digest?: string }).digest) : "";
  if (digest === "DYNAMIC_SERVER_USAGE") return true;
  const message = "message" in error ? String((error as { message?: string }).message) : "";
  return message.includes("Dynamic server usage");
}

export interface UpdateOrganizationInput {
  id: string;
  name?: string;
  tier?: SubscriptionTier;
  maxBranches?: number;
  maxUsers?: number;
  maxMenuItems?: number | null;
  features?: Record<string, boolean>;
  onlineOrderingEnabled?: boolean;
  storefrontUrl?: string | null;
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
  paystackDashboardEnabled?: boolean;
  tableManagementEnabled?: boolean;
}

/** Resolves org from user.organizationId, else branch/warehouse; may backfill user.organizationId. */
export async function getSessionOrganizationId(): Promise<string | null> {
  let session;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    if (isDynamicServerUsageError(error)) return null;
    throw error;
  }
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true, branchId: true, assignedWarehouseId: true },
  });
  if (!user) return null;

  if (user.organizationId) return user.organizationId;

  let resolved: string | null = null;
  if (user.branchId) {
    const homeBranch = await db.branch.findUnique({
      where: { id: user.branchId },
      select: { organizationId: true },
    });
    resolved = homeBranch?.organizationId ?? null;
  }
  if (!resolved && user.assignedWarehouseId) {
    const warehouse = await db.warehouse.findUnique({
      where: { id: user.assignedWarehouseId },
      select: { organizationId: true },
    });
    resolved = warehouse?.organizationId ?? null;
  }

  if (!resolved) {
    const orgs = await db.organization.findMany({
      select: { id: true },
      take: 2,
      orderBy: { createdAt: "asc" },
    });
    if (orgs.length === 1) {
      resolved = orgs[0].id;
    }
  }

  if (resolved) {
    await db.user.update({
      where: { id: session.user.id },
      data: { organizationId: resolved },
    });
  }

  return resolved;
}

export async function getOrganization(id?: string) {
  try {
    const orgId = id ?? (await getSessionOrganizationId());
    if (!orgId) return { data: null };

    const org = await db.organization.findFirst({
      where: { id: orgId },
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
      storefrontUrl: org.storefrontUrl,
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
        paystackDashboardEnabled:
          org.paystackDashboardEnabled ||
          (org.features as Record<string, unknown> | null)?.paystackDashboardEnabled === true,
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
        complimentaryApproverRoles: (org.complimentaryApproverRoles as string[] | null) ?? [
          "EXECUTIVE",
          "ADMIN",
          "SUPER_ADMIN",
        ],
        enforceCommissaryRouting: org.enforceCommissaryRouting,
        tableManagementEnabled: org.tableManagementEnabled,
        blockSalesWhenOutOfStock: org.blockSalesWhenOutOfStock,
        createdAt: org.createdAt.toISOString(),
      },
    };
  } catch (error) {
    if (!isDynamicServerUsageError(error)) {
      console.error("[getOrganization] Error:", error);
    }
    return { data: null };
  }
}

export async function getTableServiceSettings(organizationId: string) {
  try {
    const auth = await requirePermission("organization:view");
    if (!auth.ok) return { error: auth.error };

    const sessionOrgId = await getSessionOrganizationId();
    if (sessionOrgId && sessionOrgId !== organizationId) {
      return { error: "Forbidden" };
    }

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { tableManagementEnabled: true, tier: true },
    });
    if (!org) return { error: "Organization not found" };

    const tierAllowed = hasFeature(org.tier, "tableManagement");
    const branches = await db.branch.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        tableServiceEnabled: true,
        _count: { select: { diningTables: true } },
      },
      orderBy: { name: "asc" },
    });

    return {
      data: {
        tableManagementEnabled: org.tableManagementEnabled,
        tierAllowed,
        branches: branches.map((b) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          isActive: b.isActive,
          tableServiceEnabled: b.tableServiceEnabled,
          tableCount: b._count.diningTables,
        })),
      },
    };
  } catch (error) {
    console.error("[getTableServiceSettings]", error);
    return { error: "Failed to load table service settings" };
  }
}

export async function updateOrganizationTableManagement(input: {
  organizationId: string;
  tableManagementEnabled: boolean;
  tableServiceBranchIds?: string[];
}) {
  try {
    const auth = await requirePermission("organization:edit");
    if (!auth.ok) return { error: auth.error };

    const sessionOrgId = await getSessionOrganizationId();
    if (sessionOrgId && sessionOrgId !== input.organizationId) {
      return { error: "Forbidden" };
    }

    const org = await db.organization.findUnique({
      where: { id: input.organizationId },
      select: { tier: true },
    });
    if (!org) return { error: "Organization not found" };

    if (input.tableManagementEnabled && !hasFeature(org.tier, "tableManagement")) {
      return {
        error: "Upgrade to Pro or Enterprise to enable table management",
      };
    }

    await db.organization.update({
      where: { id: input.organizationId },
      data: { tableManagementEnabled: input.tableManagementEnabled },
    });

    if (!input.tableManagementEnabled) {
      await db.branch.updateMany({
        where: { organizationId: input.organizationId },
        data: { tableServiceEnabled: false },
      });
    } else if (input.tableServiceBranchIds !== undefined) {
      await setTableServiceBranches(input.organizationId, input.tableServiceBranchIds);
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/pos");
    revalidatePath("/dashboard/tables");
    return { success: true };
  } catch (error) {
    console.error("[updateOrganizationTableManagement]", error);
    return { error: "Failed to update table management settings" };
  }
}

export async function updateOrganizationPosPolicies(input: {
  organizationId: string;
  complimentaryApproverRoles: Role[];
  enforceCommissaryRouting?: boolean;
  blockSalesWhenOutOfStock?: boolean;
}) {
  try {
    const auth = await requirePermission("organization:edit");
    if (!auth.ok) return { error: auth.error };

    const sessionOrgId = await getSessionOrganizationId();
    if (sessionOrgId && sessionOrgId !== input.organizationId) {
      return { error: "Forbidden" };
    }

    await db.organization.update({
      where: { id: input.organizationId },
      data: {
        complimentaryApproverRoles: input.complimentaryApproverRoles,
        ...(input.enforceCommissaryRouting !== undefined && {
          enforceCommissaryRouting: input.enforceCommissaryRouting,
        }),
        ...(input.blockSalesWhenOutOfStock !== undefined && {
          blockSalesWhenOutOfStock: input.blockSalesWhenOutOfStock,
        }),
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/pos");
    return { success: true };
  } catch (error) {
    console.error("[updateOrganizationPosPolicies]", error);
    return { error: "Failed to update policies" };
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
      const tierAuth = await requirePermission("subscriptions:manage");
      if (!tierAuth.ok) {
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
    if (input.tableManagementEnabled && !hasFeature(existingOrg.tier, "tableManagement")) {
      return { error: "Current subscription tier does not support table management" };
    }
    if (input.tableManagementEnabled !== undefined) {
      data.tableManagementEnabled = input.tableManagementEnabled;
    }
    if (input.storefrontUrl !== undefined) {
      if (input.storefrontUrl === null || input.storefrontUrl.trim() === "") {
        data.storefrontUrl = null;
      } else {
        const normalized = normalizeStorefrontUrl(input.storefrontUrl);
        if (!normalized) {
          return { error: "Storefront URL must be a valid http or https URL" };
        }
        data.storefrontUrl = normalized;
      }
    }
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
    if (input.paystackDashboardEnabled !== undefined) {
      data.paystackDashboardEnabled = input.paystackDashboardEnabled;
      const currentFeatures =
        (data.features as Record<string, unknown> | null) ||
        (existingOrg.features as Record<string, unknown> | null) ||
        {};
      data.features = {
        ...currentFeatures,
        ...(input.features || {}),
        paystackDashboardEnabled: input.paystackDashboardEnabled,
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
      storefrontUrl: org.storefrontUrl,
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
        version: "1.5",
        apiBaseUrl,
        publicEndpoints,
        notes: {
          menu: "Fetch live menu via GET .../menu?branchId={id} after the customer picks a branch (includes optionGroups). Omit branchId to return all active items.",
          orders: "POST items[].menuItemOptionIds with selected option ids from menu.optionGroups[].options[].id",
          tax: "Use branches[].taxRate and branches[].taxInclusive for the customer's selected branchId. checkout.taxRate/taxInclusive are deprecated (first branch only).",
          paystack:
            "When features.paystackEnabled is true, only show Paystack checkout for branches where branches[].paystackConfigured is true. Each branch must have a linked Paystack subaccount (ACCT_...) in dashboard Branch settings before card payments work.",
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
    const auth = await requirePermission("subscriptions:manage");
    if (!auth.ok) {
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

export async function getPosStorefrontQrContext() {
  try {
    const organizationId = await getSessionOrganizationId();
    if (!organizationId) {
      return { data: { showQr: false, storefrontUrl: null as string | null } };
    }

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        tier: true,
        onlineOrderingEnabled: true,
        storefrontUrl: true,
      },
    });
    if (!org) {
      return { data: { showQr: false, storefrontUrl: null as string | null } };
    }

    const storefrontUrl = normalizeStorefrontUrl(org.storefrontUrl);
    const showQr =
      hasFeature(org.tier, "onlineOrdering") &&
      org.onlineOrderingEnabled &&
      storefrontUrl != null;

    return {
      data: {
        showQr,
        storefrontUrl: showQr ? storefrontUrl : null,
      },
    };
  } catch (error) {
    console.error("[getPosStorefrontQrContext] Error:", error);
    return { data: { showQr: false, storefrontUrl: null as string | null } };
  }
}
