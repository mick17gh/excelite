"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SubscriptionTier } from "@/lib/generated/prisma/client";

interface OnboardingInput {
  organization: {
    name: string;
  };
  branch: {
    name: string;
    code: string;
    address: string;
    city: string;
    phone?: string;
    email?: string;
  };
}

export async function completeOnboarding(input: OnboardingInput) {
  try {
    // Check if organization already exists
    const existingOrg = await db.organization.findFirst();
    if (existingOrg) {
      return { success: false, error: "Organization already exists" };
    }

    // Check if branch code is unique
    const existingBranch = await db.branch.findUnique({
      where: { code: input.branch.code },
    });
    if (existingBranch) {
      return { success: false, error: "Branch code already exists" };
    }

    // Create organization and first branch in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: input.organization.name,
          tier: "FREE" as SubscriptionTier,
          status: "ACTIVE",
          maxBranches: 1,
          maxUsers: 2,
          maxMenuItems: 50,
        },
      });

      // Create first branch
      const branch = await tx.branch.create({
        data: {
          name: input.branch.name,
          code: input.branch.code,
          address: input.branch.address,
          city: input.branch.city,
          phone: input.branch.phone || null,
          email: input.branch.email || null,
          isActive: true,
          taxRate: 12.5, // Default tax rate
          organizationId: organization.id, // Link to organization
        },
      });

      // Link all existing users to this organization
      await tx.user.updateMany({
        where: { organizationId: null },
        data: { organizationId: organization.id },
      });

      return { organization, branch };
    });

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");

    // Serialize Decimal fields for client components
    return {
      success: true,
      data: {
        organization: result.organization,
        branch: {
          ...result.branch,
          taxRate: Number(result.branch.taxRate),
        },
      },
    };
  } catch (error) {
    console.error("[completeOnboarding] Error:", error);
    return {
      success: false,
      error: "Failed to complete onboarding. Please try again.",
    };
  }
}

export async function checkOnboardingStatus() {
  try {
    const org = await db.organization.findFirst();
    return {
      success: true,
      data: {
        completed: !!org,
        organizationId: org?.id,
      },
    };
  } catch (error) {
    console.error("[checkOnboardingStatus] Error:", error);
    return {
      success: false,
      error: "Failed to check onboarding status",
    };
  }
}
