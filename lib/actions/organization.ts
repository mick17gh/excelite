"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SubscriptionTier, SubscriptionStatus } from "@/lib/generated/prisma/client";

export interface UpdateOrganizationInput {
  id: string;
  name?: string;
  tier?: SubscriptionTier;
  maxBranches?: number;
  maxUsers?: number;
  maxMenuItems?: number | null;
  features?: Record<string, boolean>;
}

export async function getOrganization(id?: string) {
  try {
    const where = id ? { id } : {};
    const org = await db.organization.findFirst({
      where,
      include: {
        _count: { select: { users: true, branches: true, warehouses: true } },
        subscription: {
          include: {
            payments: { orderBy: { createdAt: "desc" }, take: 10 },
          },
        },
      },
    });

    if (!org) return { data: null };

    return {
      data: {
        id: org.id,
        name: org.name,
        tier: org.tier,
        status: org.status,
        maxBranches: org.maxBranches,
        maxUsers: org.maxUsers,
        maxMenuItems: org.maxMenuItems,
        features: org.features as Record<string, boolean> | null,
        trialEndsAt: org.trialEndsAt?.toISOString() || null,
        subscriptionEndsAt: org.subscriptionEndsAt?.toISOString() || null,
        userCount: org._count.users,
        branchCount: org._count.branches,
        warehouseCount: org._count.warehouses,
        subscription: org.subscription
          ? {
              id: org.subscription.id,
              tier: org.subscription.tier,
              status: org.subscription.status,
              amount: Number(org.subscription.amount),
              currency: org.subscription.currency,
              billingCycle: org.subscription.billingCycle,
              nextBillingDate: org.subscription.nextBillingDate?.toISOString() || null,
              canceledAt: org.subscription.canceledAt?.toISOString() || null,
              payments: org.subscription.payments.map((p) => ({
                id: p.id,
                amount: Number(p.amount),
                currency: p.currency,
                status: p.status,
                paymentMethod: p.paymentMethod,
                reference: p.reference,
                paidAt: p.paidAt?.toISOString() || null,
                createdAt: p.createdAt.toISOString(),
              })),
            }
          : null,
        createdAt: org.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[getOrganization] Error:", error);
    return { data: null };
  }
}

export async function updateOrganization(input: UpdateOrganizationInput) {
  try {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.tier !== undefined) data.tier = input.tier;
    if (input.maxBranches !== undefined) data.maxBranches = input.maxBranches;
    if (input.maxUsers !== undefined) data.maxUsers = input.maxUsers;
    if (input.maxMenuItems !== undefined) data.maxMenuItems = input.maxMenuItems;
    if (input.features !== undefined) data.features = input.features;

    const org = await db.organization.update({
      where: { id: input.id },
      data,
    });

    revalidatePath("/dashboard/settings");
    return { data: org };
  } catch (error) {
    console.error("[updateOrganization] Error:", error);
    return { error: "Failed to update organization" };
  }
}

export async function createOrganization(name: string, tier: SubscriptionTier = "FREE") {
  try {
    const org = await db.organization.create({
      data: {
        name,
        tier,
        status: "ACTIVE",
        maxBranches: tier === "FREE" ? 1 : tier === "BASIC" ? 3 : tier === "PRO" ? 10 : 999,
        maxUsers: tier === "FREE" ? 2 : tier === "BASIC" ? 10 : tier === "PRO" ? 50 : 999,
      },
    });

    revalidatePath("/dashboard/settings");
    return { data: org };
  } catch (error) {
    console.error("[createOrganization] Error:", error);
    return { error: "Failed to create organization" };
  }
}

export async function getSubscriptionPayments(organizationId: string) {
  try {
    const subscription = await db.subscription.findUnique({
      where: { organizationId },
      include: {
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!subscription) return { data: [] };

    return {
      data: subscription.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        paymentMethod: p.paymentMethod,
        reference: p.reference,
        paidAt: p.paidAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[getSubscriptionPayments] Error:", error);
    return { data: [] };
  }
}
