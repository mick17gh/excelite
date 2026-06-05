/**
 * Backfill staff_job_role records and migrate staff.role enum → jobRoleId.
 * Run after applying migration 20260605120000_staff_job_roles.
 *
 * Usage: npx tsx scripts/backfill-staff-job-roles.ts
 */
import { PrismaClient } from "../lib/generated/prisma/client";
import { DEFAULT_STAFF_JOB_ROLES } from "../lib/staff/job-role-defaults";

const db = new PrismaClient();

async function main() {
  const orgs = await db.organization.findMany({ select: { id: true, name: true } });
  console.log(`Found ${orgs.length} organization(s)`);

  for (const org of orgs) {
    console.log(`\nProcessing org: ${org.name} (${org.id})`);

    const existing = await db.staffJobRole.findMany({
      where: { organizationId: org.id },
      select: { id: true, code: true, deletedAt: true },
    });
    const codeToId = new Map(existing.map((r) => [r.code, r.id]));

    for (const def of DEFAULT_STAFF_JOB_ROLES) {
      const rowId = codeToId.get(def.code);
      if (rowId) {
        const row = existing.find((r) => r.code === def.code);
        if (row?.deletedAt) {
          await db.staffJobRole.update({
            where: { id: rowId },
            data: {
              deletedAt: null,
              name: def.name,
              category: def.category,
              sortOrder: def.sortOrder,
              defaultShiftTemplate: def.defaultShiftTemplate ?? null,
              isActive: true,
            },
          });
          console.log(`  Restored role: ${def.code}`);
        }
        continue;
      }
      try {
        const created = await db.staffJobRole.create({
          data: {
            organizationId: org.id,
            name: def.name,
            code: def.code,
            category: def.category,
            sortOrder: def.sortOrder,
            defaultShiftTemplate: def.defaultShiftTemplate ?? null,
            isActive: true,
          },
        });
        codeToId.set(def.code, created.id);
        console.log(`  Created role: ${def.code}`);
      } catch (error: unknown) {
        const prismaCode =
          error && typeof error === "object" && "code" in error
            ? (error as { code: string }).code
            : null;
        if (prismaCode === "P2002") {
          const found = await db.staffJobRole.findFirst({
            where: { organizationId: org.id, code: def.code },
            select: { id: true },
          });
          if (found) codeToId.set(def.code, found.id);
          console.log(`  Skipped existing role: ${def.code}`);
          continue;
        }
        throw error;
      }
    }

    const staffRows = await db.$queryRaw<
      Array<{ id: string; role: string; branchId: string }>
    >`SELECT s.id, s.role::text AS role, s."branchId" FROM staff s
      JOIN branch b ON b.id = s."branchId"
      WHERE b."organizationId" = ${org.id} AND s."jobRoleId" IS NULL`;

    const fallbackRoleId = codeToId.get("SERVICE") ?? codeToId.get("KITCHEN");
    if (!fallbackRoleId) {
      console.warn(`  No fallback role for org ${org.id}, skipping staff mapping`);
      continue;
    }

    for (const row of staffRows) {
      const jobRoleId = codeToId.get(row.role) ?? fallbackRoleId;
      await db.staff.update({
        where: { id: row.id },
        data: { jobRoleId },
      });
      console.log(`  Mapped staff ${row.id}: ${row.role} → ${jobRoleId}`);
    }
  }

  const unmappedRows = await db.$queryRaw<[{ count: number }]>`
    SELECT COUNT(*)::int AS count FROM staff WHERE "jobRoleId" IS NULL
  `;
  const unmapped = unmappedRows[0]?.count ?? 0;
  if (unmapped > 0) {
    console.warn(`\nWarning: ${unmapped} staff still have null jobRoleId`);
    return;
  }

  console.log("\nAll staff mapped. Applying final schema constraints...");

  await db.$executeRaw`DROP INDEX IF EXISTS "staff_role_idx"`;
  await db.$executeRaw`ALTER TABLE "staff" DROP COLUMN IF EXISTS "role"`;
  await db.$executeRaw`ALTER TABLE "staff" ALTER COLUMN "jobRoleId" SET NOT NULL`;
  await db.$executeRaw`DROP TYPE IF EXISTS "StaffRole"`;

  console.log("Backfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
