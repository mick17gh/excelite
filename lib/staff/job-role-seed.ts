import { db } from "@/lib/db";
import { DEFAULT_STAFF_JOB_ROLES } from "@/lib/staff/job-role-defaults";

/** Idempotently seed default job roles for an organization. */
export async function ensureDefaultStaffJobRoles(organizationId: string) {
  const existing = await db.staffJobRole.findMany({
    where: { organizationId, deletedAt: null },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((r) => r.code));

  const toCreate = DEFAULT_STAFF_JOB_ROLES.filter((r) => !existingCodes.has(r.code));
  if (toCreate.length === 0) return { created: 0 };

  await db.staffJobRole.createMany({
    data: toCreate.map((r) => ({
      organizationId,
      name: r.name,
      code: r.code,
      category: r.category,
      sortOrder: r.sortOrder,
      defaultShiftTemplate: r.defaultShiftTemplate ?? null,
      isActive: true,
    })),
  });

  return { created: toCreate.length };
}
