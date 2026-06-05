import { Prisma } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import { DEFAULT_STAFF_JOB_ROLES } from "@/lib/staff/job-role-defaults";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

/** Idempotently seed default job roles for an organization. */
export async function ensureDefaultStaffJobRoles(organizationId: string) {
  const existing = await db.staffJobRole.findMany({
    where: { organizationId },
    select: { id: true, code: true, deletedAt: true },
  });
  const byCode = new Map(existing.map((r) => [r.code, r]));

  let restored = 0;

  for (const def of DEFAULT_STAFF_JOB_ROLES) {
    const row = byCode.get(def.code);
    if (!row?.deletedAt) continue;

    await db.staffJobRole.update({
      where: { id: row.id },
      data: {
        deletedAt: null,
        name: def.name,
        category: def.category,
        sortOrder: def.sortOrder,
        defaultShiftTemplate: def.defaultShiftTemplate ?? null,
        isActive: true,
      },
    });
    restored++;
    byCode.set(def.code, { ...row, deletedAt: null });
  }

  const toCreate = DEFAULT_STAFF_JOB_ROLES.filter((r) => !byCode.has(r.code));
  if (toCreate.length === 0) return { created: 0, restored };

  try {
    const result = await db.staffJobRole.createMany({
      data: toCreate.map((r) => ({
        organizationId,
        name: r.name,
        code: r.code,
        category: r.category,
        sortOrder: r.sortOrder,
        defaultShiftTemplate: r.defaultShiftTemplate ?? null,
        isActive: true,
      })),
      skipDuplicates: true,
    });
    return { created: result.count, restored };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { created: 0, restored };
    }
    throw error;
  }
}
