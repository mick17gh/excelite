/**
 * Fix Organization Tier Limits
 * 
 * This script updates organization limits to match their tier configuration.
 * Run with: npx tsx scripts/fix-tier-limits.ts
 */

import { db } from "../lib/db";
import { TIER_CONFIG } from "../lib/tier-config";

async function fixTierLimits() {
  console.log("🔧 Fixing organization tier limits...\n");

  try {
    // Get all organizations
    const organizations = await db.organization.findMany();

    console.log(`Found ${organizations.length} organization(s)\n`);

    for (const org of organizations) {
      const tierLimits = TIER_CONFIG[org.tier];
      
      const maxBranches = tierLimits.maxBranches === Infinity ? 999 : tierLimits.maxBranches;
      const maxUsers = tierLimits.maxUsers === Infinity ? 999 : tierLimits.maxUsers;
      const maxMenuItems = tierLimits.maxMenuItems;

      console.log(`📊 Organization: ${org.name}`);
      console.log(`   Tier: ${org.tier}`);
      console.log(`   Current limits: ${org.maxBranches} branches, ${org.maxUsers} users`);
      console.log(`   Expected limits: ${maxBranches} branches, ${maxUsers} users`);

      if (org.maxBranches !== maxBranches || org.maxUsers !== maxUsers) {
        await db.organization.update({
          where: { id: org.id },
          data: {
            maxBranches,
            maxUsers,
            maxMenuItems,
          },
        });
        console.log(`   ✅ Updated limits to match ${org.tier} tier\n`);
      } else {
        console.log(`   ✓ Limits already correct\n`);
      }
    }

    console.log("✨ All organizations updated successfully!");
  } catch (error) {
    console.error("❌ Error fixing tier limits:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

fixTierLimits();
