import { branchHasPaystackSettlement } from "@/lib/paystack/initialize";
import {
  isPaystackAnyChannelEnabledForOrg,
  isPaystackDashboardEnabledForOrg,
  isPaystackStorefrontEnabledForOrg,
  type PaystackOrgFlags,
} from "@/lib/paystack/credentials";

export type BranchPaystackSettlement = {
  paystackSubaccountCode?: string | null;
  paystackSubaccountActive?: boolean | null;
};

export type PaystackCheckoutChannel = "storefront" | "dashboard" | "any";

function isPaystackEnabledForChannel(org: PaystackOrgFlags, channel: PaystackCheckoutChannel) {
  if (channel === "storefront") return isPaystackStorefrontEnabledForOrg(org);
  if (channel === "dashboard") return isPaystackDashboardEnabledForOrg(org);
  return isPaystackAnyChannelEnabledForOrg(org);
}

export function isBranchPaystackCheckoutAvailable(
  org: PaystackOrgFlags,
  branch: BranchPaystackSettlement,
  channel: PaystackCheckoutChannel = "any",
): boolean {
  if (!isPaystackEnabledForChannel(org, channel)) return false;
  return branchHasPaystackSettlement(branch);
}

export function resolveBranchSubaccountForCheckout(
  org: PaystackOrgFlags,
  branch: BranchPaystackSettlement & { id: string },
  channel: PaystackCheckoutChannel = "any",
): { ok: true; subaccountCode: string } | { ok: false; error: string } {
  if (!isPaystackEnabledForChannel(org, channel)) {
    return { ok: false, error: "Paystack is not enabled for this organization" };
  }
  if (!branchHasPaystackSettlement(branch)) {
    return {
      ok: false,
      error:
        "This branch is not set up for Paystack payments. Link a subaccount in Branch settings.",
    };
  }
  return { ok: true, subaccountCode: branch.paystackSubaccountCode!.trim() };
}
