import { db } from "@/lib/db";

export type PaystackOrgFlags = {
  paystackEnabled?: boolean | null;
  paystackDashboardEnabled?: boolean | null;
  features?: unknown;
};

export function getEnvPaystackPublicKey(): string | null {
  return process.env.PAYSTACK_PUBLIC_KEY || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || null;
}

export function getEnvPaystackSecretKey(): string | null {
  return process.env.PAYSTACK_SECRET_KEY || null;
}

export function isPaystackConfiguredInEnv(): boolean {
  return Boolean(getEnvPaystackPublicKey() && getEnvPaystackSecretKey());
}

export function isOrgPaystackStorefrontFeatureEnabled(org: PaystackOrgFlags): boolean {
  return Boolean(
    org.paystackEnabled || (org.features as Record<string, unknown> | null)?.paystackEnabled === true
  );
}

export function isOrgPaystackDashboardFeatureEnabled(org: PaystackOrgFlags): boolean {
  return Boolean(
    org.paystackDashboardEnabled ||
      (org.features as Record<string, unknown> | null)?.paystackDashboardEnabled === true
  );
}

export function isPaystackStorefrontEnabledForOrg(org: PaystackOrgFlags): boolean {
  return isOrgPaystackStorefrontFeatureEnabled(org) && isPaystackConfiguredInEnv();
}

export function isPaystackDashboardEnabledForOrg(org: PaystackOrgFlags): boolean {
  return isOrgPaystackDashboardFeatureEnabled(org) && isPaystackConfiguredInEnv();
}

export function isPaystackAnyChannelEnabledForOrg(org: PaystackOrgFlags): boolean {
  return (
    isPaystackStorefrontEnabledForOrg(org) || isPaystackDashboardEnabledForOrg(org)
  );
}

export async function getPaystackSecretForOrganization(organizationId: string): Promise<string | null> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { paystackEnabled: true, features: true },
  });
  if (!org || !isOrgPaystackStorefrontFeatureEnabled(org)) return null;
  return getEnvPaystackSecretKey();
}
