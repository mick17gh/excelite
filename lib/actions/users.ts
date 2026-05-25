"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Role } from "@/lib/generated/prisma/client";
import bcrypt from "bcryptjs";
import { resolveOrganizationIdForUser } from "@/lib/users/organization-link";

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  error?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  branchId?: string;
  assignedWarehouseId?: string;
  phoneNumber?: string;
  isActive: boolean;
}

export interface UpdateUserInput {
  id: string;
  name?: string;
  email?: string;
  role?: Role;
  branchId?: string;
  assignedWarehouseId?: string | null;
  phoneNumber?: string;
  isActive?: boolean;
}

export async function createUser(input: CreateUserInput) {
  try {
    // Check if email already exists
    const existing = await db.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      return { success: false, error: "Email already in use" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10);

    const organizationId = await resolveOrganizationIdForUser({
      branchId: input.branchId,
      assignedWarehouseId: input.assignedWarehouseId,
    });

    // Create user
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        branchId: input.branchId,
        assignedWarehouseId: input.assignedWarehouseId,
        organizationId,
        phoneNumber: input.phoneNumber,
        isActive: input.isActive,
        emailVerified: false,
      },
    });

    // Create account with password
    await db.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });

    revalidatePath("/dashboard/users");
    return { success: true, data: user };
  } catch (error) {
    console.error("[createUser] Error:", error);
    return { success: false, error: "Failed to create user" };
  }
}

export async function updateUser(input: UpdateUserInput) {
  try {
    const { id, branchId, assignedWarehouseId, ...rest } = input;
    const data: Record<string, unknown> = { ...rest };

    if (branchId !== undefined) data.branchId = branchId;
    if (assignedWarehouseId !== undefined) data.assignedWarehouseId = assignedWarehouseId;

    if (branchId !== undefined || assignedWarehouseId !== undefined) {
      const existing = await db.user.findUnique({
        where: { id },
        select: { branchId: true, assignedWarehouseId: true },
      });
      data.organizationId = await resolveOrganizationIdForUser({
        branchId: (branchId !== undefined ? branchId : existing?.branchId) ?? null,
        assignedWarehouseId:
          (assignedWarehouseId !== undefined
            ? assignedWarehouseId
            : existing?.assignedWarehouseId) ?? null,
      });
    }

    const user = await db.user.update({
      where: { id },
      data: data as Parameters<typeof db.user.update>[0]["data"],
    });

    revalidatePath("/dashboard/users");
    return { success: true, data: user };
  } catch (error) {
    console.error("[updateUser] Error:", error);
    return { success: false, error: "Failed to update user" };
  }
}

export async function deleteUser(id: string) {
  try {
    await db.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    console.error("[deleteUser] Error:", error);
    return { success: false, error: "Failed to delete user" };
  }
}

export async function getUsers(
  pagination?: PaginationParams
): Promise<PaginatedResult<any>> {
  try {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where = { deletedAt: null };

    const [users, totalItems] = await Promise.all([
      db.user.findMany({
        where,
        include: {
          branch: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
      }),
      db.user.count({ where }),
    ]);

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      branchName: user.branch?.name || null,
      assignedWarehouseId: user.assignedWarehouseId,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }));

    return {
      success: true,
      data: formattedUsers,
      pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  } catch (error) {
    console.error("[getUsers] Error:", error);
    return {
      success: false,
      error: "Failed to fetch users",
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    };
  }
}

export async function getUsersByBranch(branchId: string) {
  try {
    const users = await db.user.findMany({
      where: { 
        deletedAt: null,
        branchId: branchId,
        isActive: true
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      branchName: user.branch?.name || null,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }));

    return { success: true, data: formattedUsers };
  } catch (error) {
    console.error("[getUsersByBranch] Error:", error);
    return { success: false, error: "Failed to fetch users for branch", data: [] };
  }
}

export async function getUserById(id: string) {
  try {
    const user = await db.user.findUnique({
      where: { id },
      include: {
        branch: true,
      },
    });
    return { success: true, data: user };
  } catch (error) {
    console.error("[getUserById] Error:", error);
    return { success: false, error: "Failed to fetch user" };
  }
}

export async function toggleUserActive(id: string) {
  try {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const updated = await db.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    revalidatePath("/dashboard/users");
    return { success: true, data: updated };
  } catch (error) {
    console.error("[toggleUserActive] Error:", error);
    return { success: false, error: "Failed to toggle user status" };
  }
}

export async function resetUserPassword(id: string, newPassword: string) {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.account.updateMany({
      where: { userId: id, providerId: "credential" },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error("[resetUserPassword] Error:", error);
    return { success: false, error: "Failed to reset password" };
  }
}
