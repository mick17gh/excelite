"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions/require";
import { getSessionOrganizationId } from "@/lib/actions/organization";

export type OrganizationSettingsData = {
  id: string;
  name: string;
  storeLogoUrl: string | null;
  tier: string;
  status: string;
  maxBranches: number;
  maxUsers: number;
  maxMenuItems: number | null;
  features: Record<string, boolean> | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  userCount: number;
  branchCount: number;
  warehouseCount: number;
  createdAt: string;
  paystackDashboardEnabled: boolean;
};

export type OrganizationSettingsBundle = {
  organization: OrganizationSettingsData;
};

export async function getOrganizationSettingsBundle(organizationId: string) {
  const auth = await requirePermission("organization:view");
  if (!auth.ok) return { error: auth.error, data: null as OrganizationSettingsBundle | null };

  const sessionOrgId = await getSessionOrganizationId();
  if (sessionOrgId && sessionOrgId !== organizationId) {
    return { error: "Forbidden", data: null as OrganizationSettingsBundle | null };
  }

  const org = await db.organization.findFirst({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      storeLogoUrl: true,
      tier: true,
      status: true,
      maxBranches: true,
      maxUsers: true,
      maxMenuItems: true,
      features: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
      paystackDashboardEnabled: true,
      createdAt: true,
      _count: { select: { users: true, branches: true, warehouses: true } },
    },
  });

  if (!org) {
    return { error: "Organization not found", data: null as OrganizationSettingsBundle | null };
  }

  const features = org.features as Record<string, unknown> | null;

  return {
    data: {
      organization: {
        id: org.id,
        name: org.name,
        storeLogoUrl: org.storeLogoUrl,
        tier: org.tier,
        status: org.status,
        maxBranches: org.maxBranches,
        maxUsers: org.maxUsers,
        maxMenuItems: org.maxMenuItems,
        features: org.features as Record<string, boolean> | null,
        trialEndsAt: org.trialEndsAt?.toISOString() ?? null,
        subscriptionEndsAt: org.subscriptionEndsAt?.toISOString() ?? null,
        userCount: org._count.users,
        branchCount: org._count.branches,
        warehouseCount: org._count.warehouses,
        createdAt: org.createdAt.toISOString(),
        paystackDashboardEnabled:
          org.paystackDashboardEnabled || features?.paystackDashboardEnabled === true,
      },
    } satisfies OrganizationSettingsBundle,
  };
}
