"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { randomBytes } from "crypto";

export type ApiScope = 
  | "menu:read"
  | "menu:write"
  | "branches:read"
  | "categories:read"
  | "inventory:read"
  | "sales:read";

export interface CreateApiKeyInput {
  name: string;
  scopes: ApiScope[];
  branchId?: string;
}

export interface UpdateApiKeyInput {
  id: string;
  name?: string;
  scopes?: ApiScope[];
  isActive?: boolean;
}

/**
 * Generate a secure API key
 */
function generateApiKey(): string {
  const prefix = "dtx_";
  const randomPart = randomBytes(32).toString("base64url");
  return `${prefix}${randomPart}`;
}

export async function createApiKey(input: CreateApiKeyInput) {
  try {
    const session = await auth.api.getSession({ headers: new Headers() });
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }
    const user = session.user;

    const key = generateApiKey();
    const scopesString = input.scopes.join(",");

    const apiKey = await db.apiKey.create({
      data: {
        key,
        name: input.name,
        scopes: scopesString,
        branchId: input.branchId || null,
        isActive: true,
        createdBy: user.id,
      },
    });

    revalidatePath("/dashboard/api-keys");
    return { success: true, data: apiKey };
  } catch (error) {
    console.error("[createApiKey] Error:", error);
    return { success: false, error: "Failed to create API key" };
  }
}

export async function updateApiKey(input: UpdateApiKeyInput) {
  try {
    const session = await auth.api.getSession({ headers: new Headers() });
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    const updateData: any = {};
    if (input.name) updateData.name = input.name;
    if (input.scopes) updateData.scopes = input.scopes.join(",");
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const apiKey = await db.apiKey.update({
      where: { id: input.id },
      data: updateData,
    });

    revalidatePath("/dashboard/api-keys");
    return { success: true, data: apiKey };
  } catch (error) {
    console.error("[updateApiKey] Error:", error);
    return { success: false, error: "Failed to update API key" };
  }
}

export async function deleteApiKey(id: string) {
  try {
    const session = await auth.api.getSession({ headers: new Headers() });
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    await db.apiKey.delete({
      where: { id },
    });

    revalidatePath("/dashboard/api-keys");
    return { success: true };
  } catch (error) {
    console.error("[deleteApiKey] Error:", error);
    return { success: false, error: "Failed to delete API key" };
  }
}

export async function getApiKeys(branchId?: string) {
  try {
    const apiKeys = await db.apiKey.findMany({
      where: {
        ...(branchId && { branchId }),
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
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: apiKeys.map((key) => ({
        ...key,
        scopes: key.scopes.split(",").filter(Boolean),
      })),
    };
  } catch (error) {
    console.error("[getApiKeys] Error:", error);
    return { success: false, error: "Failed to fetch API keys", data: [] };
  }
}

export async function getApiKeyById(id: string) {
  try {
    const apiKey = await db.apiKey.findUnique({
      where: { id },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!apiKey) {
      return { success: false, error: "API key not found" };
    }

    return {
      success: true,
      data: {
        ...apiKey,
        scopes: apiKey.scopes.split(",").filter(Boolean),
      },
    };
  } catch (error) {
    console.error("[getApiKeyById] Error:", error);
    return { success: false, error: "Failed to fetch API key" };
  }
}
