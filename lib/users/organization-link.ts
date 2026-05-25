import { db } from "@/lib/db";

/** Derive organizationId from branch or warehouse assignment. */
export async function resolveOrganizationIdForUser(input: {
  branchId?: string | null;
  assignedWarehouseId?: string | null;
}): Promise<string | null> {
  if (input.branchId) {
    const branch = await db.branch.findUnique({
      where: { id: input.branchId },
      select: { organizationId: true },
    });
    if (branch?.organizationId) return branch.organizationId;
  }

  if (input.assignedWarehouseId) {
    const warehouse = await db.warehouse.findUnique({
      where: { id: input.assignedWarehouseId },
      select: { organizationId: true },
    });
    if (warehouse?.organizationId) return warehouse.organizationId;
  }

  const orgs = await db.organization.findMany({
    select: { id: true },
    take: 2,
    orderBy: { createdAt: "asc" },
  });
  return orgs.length === 1 ? orgs[0].id : null;
}
