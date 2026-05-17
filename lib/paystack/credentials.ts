import { db } from "@/lib/db";

export type PaystackOrgFlags = {
  paystackEnabled: boolean | null;
  features: unknown;
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

export function isOrgPaystackFeatureEnabled(org: PaystackOrgFlags): boolean {
  return Boolean(
    org.paystackEnabled || (org.features as Record<string, unknown> | null)?.paystackEnabled === true
  );
}

export function isPaystackEnabledForOrg(org: PaystackOrgFlags): boolean {
  return isOrgPaystackFeatureEnabled(org) && isPaystackConfiguredInEnv();
}

export async function getPaystackSecretForOrganization(organizationId: string): Promise<string | null> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { paystackEnabled: true, features: true },
  });
  if (!org || !isOrgPaystackFeatureEnabled(org)) return null;
  return getEnvPaystackSecretKey();
}
