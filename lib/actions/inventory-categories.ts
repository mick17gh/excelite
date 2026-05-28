"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@/lib/generated/prisma/client";

async function getActor() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;
  return {
    userId: session.user.id,
    role: session.user.role as Role,
  };
}

async function resolveOrganizationId(): Promise<string | null> {
  const actor = await getActor();
  if (!actor) return null;
  const user = await db.user.findUnique({
    where: { id: actor.userId },
    select: { organizationId: true },
  });
  return user?.organizationId ?? null;
}

export async function listInventoryCategories(options?: {
  organizationId?: string;
  activeOnly?: boolean;
}) {
  const actor = await getActor();
  if (!actor || !hasPermission(actor.role, "inventory:view")) {
    return { success: false, error: "Forbidden", data: [] };
  }
  const orgId = options?.organizationId ?? (await resolveOrganizationId());
  if (!orgId) return { success: false, error: "Organization not found", data: [] };

  const rows = await db.inventoryCategoryMaster.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      ...(options?.activeOnly ? { isActive: true } : {}),
    },
    include: {
      _count: {
        select: { inventoryItems: true, warehouseInventoryItems: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return {
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      isActive: r.isActive,
      sortOrder: r.sortOrder,
      inventoryItemCount: r._count.inventoryItems,
      warehouseItemCount: r._count.warehouseInventoryItems,
      totalItemCount: r._count.inventoryItems + r._count.warehouseInventoryItems,
    })),
  };
}

export async function createInventoryCategory(input: {
  name: string;
  code: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  const actor = await getActor();
  if (!actor || !hasPermission(actor.role, "categories:manage")) {
    return { success: false, error: "Forbidden" };
  }
  const orgId = await resolveOrganizationId();
  if (!orgId) return { success: false, error: "Organization not found" };

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name || !code) {
    return { success: false, error: "Name and code are required" };
  }

  await db.inventoryCategoryMaster.create({
    data: {
      organizationId: orgId,
      name,
      code,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
  });

  revalidatePath("/dashboard/inventory-categories");
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/warehouse");
  return { success: true };
}

export async function updateInventoryCategory(input: {
  id: string;
  name?: string;
  code?: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  const actor = await getActor();
  if (!actor || !hasPermission(actor.role, "categories:manage")) {
    return { success: false, error: "Forbidden" };
  }
  const orgId = await resolveOrganizationId();
  if (!orgId) return { success: false, error: "Organization not found" };

  const existing = await db.inventoryCategoryMaster.findFirst({
    where: { id: input.id, organizationId: orgId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Category not found" };

  await db.inventoryCategoryMaster.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });

  revalidatePath("/dashboard/inventory-categories");
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/warehouse");
  return { success: true };
}

export async function deleteOrArchiveInventoryCategory(id: string) {
  const actor = await getActor();
  if (!actor || !hasPermission(actor.role, "categories:manage")) {
    return { success: false, error: "Forbidden" };
  }
  const orgId = await resolveOrganizationId();
  if (!orgId) return { success: false, error: "Organization not found" };

  const existing = await db.inventoryCategoryMaster.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      _count: {
        select: { inventoryItems: true, warehouseInventoryItems: true },
      },
    },
  });
  if (!existing) return { success: false, error: "Category not found" };

  const inUse =
    existing._count.inventoryItems + existing._count.warehouseInventoryItems;
  if (inUse > 0) {
    await db.inventoryCategoryMaster.update({
      where: { id },
      data: { isActive: false },
    });
  } else {
    await db.inventoryCategoryMaster.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  revalidatePath("/dashboard/inventory-categories");
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/warehouse");
  return { success: true };
}

export async function restoreInventoryCategory(id: string) {
  const actor = await getActor();
  if (!actor || !hasPermission(actor.role, "categories:manage")) {
    return { success: false, error: "Forbidden" };
  }
  const orgId = await resolveOrganizationId();
  if (!orgId) return { success: false, error: "Organization not found" };

  const existing = await db.inventoryCategoryMaster.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    select: { id: true, isActive: true },
  });
  if (!existing) return { success: false, error: "Category not found" };
  if (existing.isActive) return { success: true };

  await db.inventoryCategoryMaster.update({
    where: { id },
    data: { isActive: true },
  });

  revalidatePath("/dashboard/inventory-categories");
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/warehouse");
  return { success: true };
}
