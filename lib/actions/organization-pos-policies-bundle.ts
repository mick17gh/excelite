"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions/require";
import { getSessionOrganizationId } from "@/lib/actions/organization";
import type { Role } from "@/lib/generated/prisma/client";

export type OrganizationPosPoliciesBundle = {
  complimentaryApproverRoles: Role[];
  enforceCommissaryRouting: boolean;
  blockSalesWhenOutOfStock: boolean;
  posBarcodeEnabled: boolean;
};

export async function getOrganizationPosPoliciesBundle(organizationId: string) {
  const auth = await requirePermission("organization:view");
  if (!auth.ok) {
    return { error: auth.error, data: null as OrganizationPosPoliciesBundle | null };
  }

  const sessionOrgId = await getSessionOrganizationId();
  if (sessionOrgId && sessionOrgId !== organizationId) {
    return { error: "Forbidden", data: null as OrganizationPosPoliciesBundle | null };
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      complimentaryApproverRoles: true,
      enforceCommissaryRouting: true,
      blockSalesWhenOutOfStock: true,
      posBarcodeEnabled: true,
    },
  });

  if (!org) {
    return { error: "Organization not found", data: null as OrganizationPosPoliciesBundle | null };
  }

  return {
    data: {
      complimentaryApproverRoles: ((org.complimentaryApproverRoles as Role[] | null) ?? [
        "EXECUTIVE",
        "ADMIN",
        "SUPER_ADMIN",
      ]) as Role[],
      enforceCommissaryRouting: org.enforceCommissaryRouting,
      blockSalesWhenOutOfStock: org.blockSalesWhenOutOfStock,
      posBarcodeEnabled: org.posBarcodeEnabled,
    } satisfies OrganizationPosPoliciesBundle,
  };
}

export async function getMenuPosBarcodeEnabled() {
  try {
    const organizationId = await getSessionOrganizationId();
    if (!organizationId) return { data: false };

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { posBarcodeEnabled: true },
    });

    return { data: org?.posBarcodeEnabled ?? false };
  } catch {
    return { data: false };
  }
}
