import { cache } from "react";
import { db } from "@/lib/db";
import { hasFeature } from "@/lib/tier-config";
import type { SubscriptionTier } from "@/lib/generated/prisma/client";

export const getOrganizationTableSettings = cache(async (organizationId: string) => {
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
});

export async function isTableManagementEnabled(organizationId: string): Promise<boolean> {
  const s = await getOrganizationTableSettings(organizationId);
  return s.enabled;
}

/** Org module licensed and enabled (nav, settings, reports). */
export async function requireTableForDineIn(organizationId: string): Promise<boolean> {
  return isTableManagementEnabled(organizationId);
}

/** Branch opted into table service: org module on AND branch.tableServiceEnabled. */
export async function isTableManagementEnabledForBranch(
  branchId: string,
): Promise<boolean> {
  const branch = await db.branch.findUnique({
    where: { id: branchId },
    select: { organizationId: true, tableServiceEnabled: true },
  });
  if (!branch?.organizationId || !branch.tableServiceEnabled) return false;
  return isTableManagementEnabled(branch.organizationId);
}

/** DINE_IN POS orders at this branch must use an open table session. */
export async function requireTableForDineInAtBranch(branchId: string): Promise<boolean> {
  return isTableManagementEnabledForBranch(branchId);
}

export async function getTableServiceBranchIds(organizationId: string): Promise<string[]> {
  const branches = await db.branch.findMany({
    where: {
      organizationId,
      deletedAt: null,
      tableServiceEnabled: true,
    },
    select: { id: true },
  });
  return branches.map((b) => b.id);
}

export async function setTableServiceBranches(
  organizationId: string,
  branchIds: string[],
): Promise<void> {
  const orgBranches = await db.branch.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true },
  });
  const allowed = new Set(orgBranches.map((b) => b.id));
  const selected = new Set(branchIds.filter((id) => allowed.has(id)));

  await db.$transaction(
    orgBranches.map((b) =>
      db.branch.update({
        where: { id: b.id },
        data: { tableServiceEnabled: selected.has(b.id) },
      })
    )
  );
}
