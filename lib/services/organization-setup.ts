"use server";

import { db } from "@/lib/db";
import { SubscriptionTier } from "@/lib/generated/prisma/client";

/**
 * Ensures an organization exists for the system.
 * Creates a default organization if none exists.
 * This is called automatically when needed.
 */
export async function ensureOrganizationExists() {
  try {
    // Check if any organization exists
    const existingOrg = await db.organization.findFirst();
    
    if (existingOrg) {
      return { success: true, data: existingOrg };
    }

    // No organization exists - create default one
    console.log("[Organization Setup] No organization found. Creating default organization...");
    
    const newOrg = await db.organization.create({
      data: {
        name: "My Restaurant",
        tier: "FREE" as SubscriptionTier,
        status: "ACTIVE",
        maxBranches: 1,
        maxUsers: 2,
        maxMenuItems: 50,
      },
    });

    console.log("[Organization Setup] Created organization:", newOrg.id);
    
    return { success: true, data: newOrg };
  } catch (error) {
    console.error("[Organization Setup] Error:", error);
    return { success: false, error: "Failed to ensure organization exists" };
  }
}

/**
 * Links a user to the organization if they don't have one.
 * Called after user creation or login.
 */
export async function ensureUserHasOrganization(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // User already has an organization
    if (user.organizationId) {
      return { success: true, data: { alreadyLinked: true } };
    }

    // Ensure organization exists
    const orgResult = await ensureOrganizationExists();
    if (!orgResult.success || !orgResult.data) {
      return { success: false, error: "Failed to get organization" };
    }

    // Link user to organization
    await db.user.update({
      where: { id: userId },
      data: { organizationId: orgResult.data.id },
    });

    console.log(`[Organization Setup] Linked user ${userId} to organization ${orgResult.data.id}`);
    
    return { success: true, data: { linked: true, organizationId: orgResult.data.id } };
  } catch (error) {
    console.error("[Organization Setup] Error linking user:", error);
    return { success: false, error: "Failed to link user to organization" };
  }
}

/**
 * Setup organization with custom details.
 * Used for onboarding flow.
 */
export async function setupOrganization(input: {
  name: string;
  tier?: SubscriptionTier;
}) {
  try {
    const existingOrg = await db.organization.findFirst();
    
    if (existingOrg) {
      // Update existing organization
      const updated = await db.organization.update({
        where: { id: existingOrg.id },
        data: { name: input.name },
      });
      return { success: true, data: updated };
    }

    // Create new organization
    const newOrg = await db.organization.create({
      data: {
        name: input.name,
        tier: input.tier || "FREE",
        status: "ACTIVE",
        maxBranches: 1,
        maxUsers: 2,
        maxMenuItems: 50,
      },
    });

    return { success: true, data: newOrg };
  } catch (error) {
    console.error("[Organization Setup] Error:", error);
    return { success: false, error: "Failed to setup organization" };
  }
}
