export type MenuItemBranchVisibility = {
  availableAtAllBranches: boolean;
  branchIds: string[];
};

export function isMenuItemVisibleAtBranch(
  item: MenuItemBranchVisibility,
  branchId: string | null | undefined
): boolean {
  if (!branchId) return false;
  if (item.availableAtAllBranches) return true;
  return item.branchIds.includes(branchId);
}

export function menuItemVisibilityWhere(branchId: string) {
  return {
    OR: [
      { availableAtAllBranches: true },
      { branchAvailability: { some: { branchId } } },
    ],
  };
}

export function serializeMenuItemBranchVisibility(
  availableAtAllBranches: boolean,
  branchAvailability: { branchId: string }[]
): MenuItemBranchVisibility {
  return {
    availableAtAllBranches,
    branchIds: branchAvailability.map((r) => r.branchId),
  };
}

export function validateMenuItemBranchScope(
  availableAtAllBranches: boolean,
  branchIds: string[] | undefined
): string | null {
  if (availableAtAllBranches) return null;
  const ids = branchIds?.filter(Boolean) ?? [];
  if (ids.length === 0) {
    return "Select at least one branch when visibility is limited to specific branches";
  }
  return null;
}

export function resolveBranchRefsFromList(
  refs: string[],
  branches: { id: string; name: string; code: string }[]
): { ok: true; ids: string[] } | { ok: false; error: string } {
  const unique = [...new Set(refs.map((r) => r.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return { ok: false, error: "No branches specified" };
  }

  const byCode = new Map(branches.map((b) => [b.code.toLowerCase(), b.id]));
  const byName = new Map(branches.map((b) => [b.name.toLowerCase(), b.id]));
  const ids: string[] = [];
  const unknown: string[] = [];

  for (const ref of unique) {
    const key = ref.toLowerCase();
    const id = byCode.get(key) ?? byName.get(key);
    if (id) {
      if (!ids.includes(id)) ids.push(id);
    } else {
      unknown.push(ref);
    }
  }

  if (unknown.length > 0) {
    return {
      ok: false,
      error: `Unknown branch: ${unknown.join(", ")}`,
    };
  }

  return { ok: true, ids };
}

export async function resolveOrgBranchIds(
  branchIds: string[]
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const unique = [...new Set(branchIds)];
  if (unique.length === 0) {
    return { ok: false, error: "No branches selected" };
  }

  const { getSessionOrganizationId } = await import("@/lib/actions/organization");
  const orgId = await getSessionOrganizationId();

  const { db } = await import("@/lib/db");
  const branches = await db.branch.findMany({
    where: {
      id: { in: unique },
      deletedAt: null,
      isActive: true,
      ...(orgId ? { organizationId: orgId } : {}),
    },
    select: { id: true },
  });

  if (branches.length !== unique.length) {
    return { ok: false, error: "One or more selected branches are invalid" };
  }

  return { ok: true, ids: unique };
}

export async function assertMenuItemsVisibleAtBranch(
  menuItemIds: string[],
  branchId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (menuItemIds.length === 0) return { ok: true };

  const { db } = await import("@/lib/db");
  const items = await db.menuItem.findMany({
    where: {
      id: { in: menuItemIds },
      deletedAt: null,
      isActive: true,
      ...menuItemVisibilityWhere(branchId),
    },
    select: { id: true, name: true },
  });

  if (items.length !== menuItemIds.length) {
    const found = new Set(items.map((i) => i.id));
    const missing = menuItemIds.filter((id) => !found.has(id));
    return {
      ok: false,
      error: `One or more items are not available at this branch (${missing.length} invalid)`,
    };
  }

  return { ok: true };
}
