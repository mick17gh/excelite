"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface TaxConfigInput {
  branchId: string;
  name: string;
  rate: number;
  description?: string;
  isDefault?: boolean;
  appliesTo?: string;
}

export type BranchTaxSettings = {
  rate: number;
  name: string;
  enabled: boolean;
  inclusive: boolean;
  showTaxOnReceipt: boolean;
  taxNumber: string | null;
  showTaxNumberOnReceipt: boolean;
};

const DEFAULT_TAX_SETTINGS: BranchTaxSettings = {
  rate: 12.5,
  name: "VAT",
  enabled: true,
  inclusive: false,
  showTaxOnReceipt: true,
  taxNumber: null,
  showTaxNumberOnReceipt: false,
};

export async function getTaxConfigs(branchId?: string) {
  try {
    const configs = await db.taxConfig.findMany({
      where: {
        isActive: true,
        ...(branchId && { branchId }),
      },
      include: {
        branch: {
          select: { name: true, code: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: configs.map((c) => ({
        ...c,
        rate: Number(c.rate),
      })),
    };
  } catch (error) {
    console.error("[getTaxConfigs] Error:", error);
    return { success: false, error: "Failed to fetch tax configs", data: [] };
  }
}

export async function createTaxConfig(input: TaxConfigInput) {
  try {
    // If setting as default, unset other defaults for this branch
    if (input.isDefault) {
      await db.taxConfig.updateMany({
        where: { branchId: input.branchId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const config = await db.taxConfig.create({
      data: {
        branchId: input.branchId,
        name: input.name,
        rate: input.rate,
        description: input.description,
        isDefault: input.isDefault || false,
        appliesTo: input.appliesTo,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/branches");

    return {
      success: true,
      data: {
        ...config,
        rate: Number(config.rate),
      },
    };
  } catch (error) {
    console.error("[createTaxConfig] Error:", error);
    return { success: false, error: "Failed to create tax config" };
  }
}

export async function updateTaxConfig(id: string, input: Partial<TaxConfigInput>) {
  try {
    // If setting as default, unset other defaults for this branch
    if (input.isDefault && input.branchId) {
      await db.taxConfig.updateMany({
        where: { branchId: input.branchId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const config = await db.taxConfig.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.rate !== undefined && { rate: input.rate }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
        ...(input.appliesTo !== undefined && { appliesTo: input.appliesTo }),
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/branches");

    return {
      success: true,
      data: {
        ...config,
        rate: Number(config.rate),
      },
    };
  } catch (error) {
    console.error("[updateTaxConfig] Error:", error);
    return { success: false, error: "Failed to update tax config" };
  }
}

export async function deleteTaxConfig(id: string) {
  try {
    await db.taxConfig.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/branches");

    return { success: true };
  } catch (error) {
    console.error("[deleteTaxConfig] Error:", error);
    return { success: false, error: "Failed to delete tax config" };
  }
}

export async function getBranchTaxRate(branchId: string): Promise<BranchTaxSettings> {
  try {
    const branch = await db.branch.findUnique({
      where: { id: branchId },
      select: {
        taxRate: true,
        taxName: true,
        taxEnabled: true,
        taxInclusive: true,
        showTaxOnReceipt: true,
        taxNumber: true,
        showTaxNumberOnReceipt: true,
      },
    });

    if (!branch) {
      return { ...DEFAULT_TAX_SETTINGS };
    }

    return {
      rate: Number(branch.taxRate),
      name: branch.taxName,
      enabled: branch.taxEnabled,
      inclusive: branch.taxInclusive,
      showTaxOnReceipt: branch.showTaxOnReceipt,
      taxNumber: branch.taxNumber,
      showTaxNumberOnReceipt: branch.showTaxNumberOnReceipt,
    };
  } catch (error) {
    console.error("[getBranchTaxRate] Error:", error);
    return { ...DEFAULT_TAX_SETTINGS };
  }
}

export async function updateBranchTaxSettings(
  branchId: string,
  settings: {
    taxRate?: number;
    taxName?: string;
    taxEnabled?: boolean;
    taxInclusive?: boolean;
    showTaxOnReceipt?: boolean;
    taxNumber?: string | null;
    showTaxNumberOnReceipt?: boolean;
  },
) {
  try {
    const normalizedTaxNumber =
      settings.taxNumber !== undefined
        ? settings.taxNumber?.trim() || null
        : undefined;

    const branch = await db.branch.update({
      where: { id: branchId },
      data: {
        ...(settings.taxRate !== undefined && { taxRate: settings.taxRate }),
        ...(settings.taxName !== undefined && { taxName: settings.taxName }),
        ...(settings.taxEnabled !== undefined && { taxEnabled: settings.taxEnabled }),
        ...(settings.taxInclusive !== undefined && { taxInclusive: settings.taxInclusive }),
        ...(settings.showTaxOnReceipt !== undefined && {
          showTaxOnReceipt: settings.showTaxOnReceipt,
        }),
        ...(normalizedTaxNumber !== undefined && { taxNumber: normalizedTaxNumber }),
        ...(settings.showTaxNumberOnReceipt !== undefined && {
          // Force off when clearing the tax number
          showTaxNumberOnReceipt:
            normalizedTaxNumber === null || normalizedTaxNumber === ""
              ? false
              : settings.showTaxNumberOnReceipt,
        }),
      },
    });

    revalidatePath("/dashboard/branches");
    revalidatePath("/dashboard/settings");
    revalidatePath("/pos");

    return {
      success: true,
      data: {
        taxRate: Number(branch.taxRate),
        taxName: branch.taxName,
        taxEnabled: branch.taxEnabled,
        taxInclusive: branch.taxInclusive,
        showTaxOnReceipt: branch.showTaxOnReceipt,
        taxNumber: branch.taxNumber,
        showTaxNumberOnReceipt: branch.showTaxNumberOnReceipt,
      },
    };
  } catch (error) {
    console.error("[updateBranchTaxSettings] Error:", error);
    return { success: false, error: "Failed to update tax settings" };
  }
}
