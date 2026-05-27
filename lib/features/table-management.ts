import { db } from "@/lib/db";
import { hasFeature } from "@/lib/tier-config";
import type { SubscriptionTier } from "@/lib/generated/prisma/client";

export async function getOrganizationTableSettings(organizationId: string) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { tableManagementEnabled: true, tier: true },
  });
  if (!org) return { enabled: false, tierAllowed: false };
  const tierAllowed = hasFeature(org.tier, "tableManagement");
  return {
    enabled: tierAllowed && org.tableManagementEnabled,
    tierAllowed,
    tableManagementEnabled: org.tableManagementEnabled,
    tier: org.tier as SubscriptionTier,
  };
}

export async function isTableManagementEnabled(organizationId: string): Promise<boolean> {
  const s = await getOrganizationTableSettings(organizationId);
  return s.enabled;
}

/** When module is on, DINE_IN POS orders should use an open table session. */
export async function requireTableForDineIn(organizationId: string): Promise<boolean> {
  return isTableManagementEnabled(organizationId);
}

export async function isTableManagementEnabledForBranch(
  branchId: string,
): Promise<boolean> {
  const branch = await db.branch.findUnique({
    where: { id: branchId },
    select: { organizationId: true },
  });
  if (!branch?.organizationId) return false;
  return isTableManagementEnabled(branch.organizationId);
}
