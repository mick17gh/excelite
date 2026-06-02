/**
 * Backfill org_role_permission for all existing organizations.
 * Run after migrate: npx tsx scripts/backfill-org-role-permissions.ts
 */
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { seedOrgRolePermissions } from "../lib/permissions/seed";

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  console.log(`Backfilling permissions for ${orgs.length} organization(s)...`);
  for (const org of orgs) {
    await seedOrgRolePermissions(prisma, org.id);
    console.log(`  ✓ ${org.name}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
