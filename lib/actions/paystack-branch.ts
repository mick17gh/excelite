"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  isPaystackAnyChannelEnabledForOrg,
  isPaystackConfiguredInEnv,
} from "@/lib/paystack/credentials";
import {
  createPaystackSubaccount,
  fetchPaystackSubaccount,
  isValidPaystackSubaccountCode,
  resolvePaystackAccount,
} from "@/lib/paystack/subaccounts";

async function getBranchWithOrg(branchId: string) {
  return db.branch.findUnique({
    where: { id: branchId },
    select: {
      id: true,
      name: true,
      code: true,
      currency: true,
      organizationId: true,
      paystackSubaccountCode: true,
      paystackSubaccountSource: true,
      organization: {
        select: {
          paystackEnabled: true,
          paystackDashboardEnabled: true,
          features: true,
        },
      },
    },
  });
}

async function assertPaystackEnabledForBranch(branchId: string) {
  const branch = await getBranchWithOrg(branchId);
  if (!branch) return { ok: false as const, error: "Branch not found" };
  if (!branch.organization) {
    return { ok: false as const, error: "Branch is not linked to an organization" };
  }
  if (!isPaystackConfiguredInEnv()) {
    return { ok: false as const, error: "Paystack is not configured on this server" };
  }
  if (!isPaystackAnyChannelEnabledForOrg(branch.organization)) {
    return {
      ok: false as const,
      error: "Enable Paystack in organization settings before configuring branch settlement",
    };
  }
  return { ok: true as const, branch };
}

function mapSubaccountToBranchUpdate(
  subaccount: Awaited<ReturnType<typeof fetchPaystackSubaccount>>,
  source: "linked" | "created",
  extra?: {
    settlementBankCode?: string;
    settlementAccountNumber?: string;
    settlementAccountName?: string;
  },
) {
  return {
    paystackSubaccountCode: subaccount.subaccount_code,
    paystackSubaccountId: subaccount.id,
    paystackSubaccountActive: subaccount.active,
    paystackPercentageCharge: subaccount.percentage_charge,
    paystackSubaccountSyncedAt: new Date(),
    paystackSubaccountSource: source,
    ...(extra?.settlementBankCode !== undefined
      ? { settlementBankCode: extra.settlementBankCode }
      : {}),
    ...(extra?.settlementAccountNumber !== undefined
      ? { settlementAccountNumber: extra.settlementAccountNumber }
      : {}),
    ...(extra?.settlementAccountName !== undefined
      ? { settlementAccountName: extra.settlementAccountName }
      : {}),
  };
}

function revalidateBranchPaths(branchId: string) {
  revalidatePath("/dashboard/branches");
  revalidatePath(`/dashboard/branches/${branchId}`);
  revalidatePath("/dashboard/settings");
}

export async function verifyBranchSettlementAccount(input: {
  bankCode: string;
  accountNumber: string;
}) {
  try {
    if (!isPaystackConfiguredInEnv()) {
      return { success: false, error: "Paystack is not configured" };
    }
    const resolved = await resolvePaystackAccount(input.bankCode, input.accountNumber.trim());
    return {
      success: true,
      data: {
        accountName: resolved.account_name,
        accountNumber: resolved.account_number,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify account",
    };
  }
}

export async function linkBranchPaystackSubaccount(branchId: string, subaccountCode: string) {
  try {
    const guard = await assertPaystackEnabledForBranch(branchId);
    if (!guard.ok) return { success: false, error: guard.error };

    const code = subaccountCode.trim();
    if (!isValidPaystackSubaccountCode(code)) {
      return { success: false, error: "Invalid subaccount code. Expected format ACCT_..." };
    }

    const subaccount = await fetchPaystackSubaccount(code);
    const updated = await db.branch.update({
      where: { id: branchId },
      data: mapSubaccountToBranchUpdate(subaccount, "linked", {
        settlementAccountNumber: subaccount.account_number,
        settlementAccountName: subaccount.settlement_bank,
      }),
    });

    revalidateBranchPaths(branchId);
    return {
      success: true,
      data: {
        paystackSubaccountCode: updated.paystackSubaccountCode,
        paystackSubaccountActive: updated.paystackSubaccountActive,
      },
    };
  } catch (error) {
    console.error("[linkBranchPaystackSubaccount]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to link subaccount",
    };
  }
}

export async function createBranchPaystackSubaccount(
  branchId: string,
  input: { bankCode: string; accountNumber: string },
) {
  try {
    const guard = await assertPaystackEnabledForBranch(branchId);
    if (!guard.ok) return { success: false, error: guard.error };

    const { branch } = guard;
    if (branch.paystackSubaccountCode && branch.paystackSubaccountSource === "created") {
      return {
        success: false,
        error: "This branch already has a Paystack subaccount. Refresh or unlink first.",
      };
    }

    const accountNumber = input.accountNumber.trim();
    const resolved = await resolvePaystackAccount(input.bankCode, accountNumber);

    const subaccount = await createPaystackSubaccount({
      businessName: branch.name,
      bankCode: input.bankCode,
      accountNumber,
      percentageCharge: 0,
      description: `SERVSTACK branch ${branch.code}`,
      metadata: {
        branchId: branch.id,
        organizationId: branch.organizationId || "",
      },
    });

    const updated = await db.branch.update({
      where: { id: branchId },
      data: mapSubaccountToBranchUpdate(subaccount, "created", {
        settlementBankCode: input.bankCode,
        settlementAccountNumber: accountNumber,
        settlementAccountName: resolved.account_name,
      }),
    });

    revalidateBranchPaths(branchId);
    return {
      success: true,
      data: {
        paystackSubaccountCode: updated.paystackSubaccountCode,
        paystackSubaccountActive: updated.paystackSubaccountActive,
        settlementAccountName: updated.settlementAccountName,
      },
    };
  } catch (error) {
    console.error("[createBranchPaystackSubaccount]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create subaccount",
    };
  }
}

export async function syncBranchPaystackSubaccount(branchId: string) {
  try {
    const guard = await assertPaystackEnabledForBranch(branchId);
    if (!guard.ok) return { success: false, error: guard.error };

    const code = guard.branch.paystackSubaccountCode;
    if (!code) {
      return { success: false, error: "No Paystack subaccount linked for this branch" };
    }

    const subaccount = await fetchPaystackSubaccount(code);
    const updated = await db.branch.update({
      where: { id: branchId },
      data: mapSubaccountToBranchUpdate(
        subaccount,
        (guard.branch.paystackSubaccountSource as "linked" | "created") || "linked",
      ),
    });

    revalidateBranchPaths(branchId);
    return {
      success: true,
      data: {
        paystackSubaccountCode: updated.paystackSubaccountCode,
        paystackSubaccountActive: updated.paystackSubaccountActive,
      },
    };
  } catch (error) {
    console.error("[syncBranchPaystackSubaccount]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sync subaccount",
    };
  }
}

export async function unlinkBranchPaystackSubaccount(branchId: string) {
  try {
    const guard = await assertPaystackEnabledForBranch(branchId);
    if (!guard.ok) return { success: false, error: guard.error };

    await db.branch.update({
      where: { id: branchId },
      data: {
        paystackSubaccountCode: null,
        paystackSubaccountId: null,
        paystackSubaccountActive: null,
        paystackSubaccountSyncedAt: null,
        paystackSubaccountSource: null,
      },
    });

    revalidateBranchPaths(branchId);
    return { success: true };
  } catch (error) {
    console.error("[unlinkBranchPaystackSubaccount]", error);
    return { success: false, error: "Failed to unlink subaccount" };
  }
}

export async function countBranchesWithoutPaystackSubaccount(organizationId: string) {
  try {
    const count = await db.branch.count({
      where: {
        organizationId,
        deletedAt: null,
        isActive: true,
        OR: [{ paystackSubaccountCode: null }, { paystackSubaccountCode: "" }],
      },
    });
    return { success: true, data: { count } };
  } catch (error) {
    return { success: false, error: "Failed to count branches", data: { count: 0 } };
  }
}

export async function getPaystackBanksForBranch(branchId: string) {
  try {
    const branch = await db.branch.findUnique({
      where: { id: branchId },
      select: { currency: true },
    });
    if (!branch) return { success: false, error: "Branch not found", data: [] };

    const { listPaystackBanks } = await import("@/lib/paystack/subaccounts");
    const currency = branch.currency === "NGN" ? "NGN" : "GHS";
    const banks = await listPaystackBanks(currency);
    return { success: true, data: banks };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load banks",
      data: [],
    };
  }
}
