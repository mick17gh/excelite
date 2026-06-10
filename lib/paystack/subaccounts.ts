import { getEnvPaystackSecretKey } from "@/lib/paystack/credentials";

const PAYSTACK_BASE = "https://api.paystack.co";

export type PaystackBank = {
  name: string;
  code: string;
  currency: string;
};

export type PaystackSubaccount = {
  id: number;
  subaccount_code: string;
  business_name: string;
  account_number: string;
  settlement_bank: string;
  percentage_charge: number;
  active: boolean;
  is_verified: boolean;
  currency?: string;
};

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

function getSecretOrThrow(): string {
  const secret = getEnvPaystackSecretKey();
  if (!secret) throw new Error("Paystack is not configured");
  return secret;
}

async function paystackRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<PaystackResponse<T>> {
  const secret = getSecretOrThrow();
  const response = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const payload = (await response.json()) as PaystackResponse<T>;
  if (!response.ok || !payload.status) {
    throw new Error(payload.message || `Paystack request failed (${response.status})`);
  }
  return payload;
}

export function isValidPaystackSubaccountCode(code: string): boolean {
  return /^ACCT_[a-z0-9]+$/i.test(code.trim());
}

export async function listPaystackBanks(currency: "GHS" | "NGN" = "GHS"): Promise<PaystackBank[]> {
  const payload = await paystackRequest<PaystackBank[]>(
    `/bank?currency=${currency}&perPage=100`,
  );
  return payload.data || [];
}

export async function resolvePaystackAccount(
  bankCode: string,
  accountNumber: string,
): Promise<{ account_name: string; account_number: string }> {
  const payload = await paystackRequest<{
    account_name: string;
    account_number: string;
  }>(`/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`);
  return payload.data;
}

export async function fetchPaystackSubaccount(code: string): Promise<PaystackSubaccount> {
  const normalized = code.trim();
  const payload = await paystackRequest<PaystackSubaccount>(
    `/subaccount/${encodeURIComponent(normalized)}`,
  );
  return payload.data;
}

export async function createPaystackSubaccount(input: {
  businessName: string;
  bankCode: string;
  accountNumber: string;
  percentageCharge?: number;
  description?: string;
  metadata?: Record<string, string>;
}): Promise<PaystackSubaccount> {
  const payload = await paystackRequest<PaystackSubaccount>("/subaccount", {
    method: "POST",
    body: JSON.stringify({
      business_name: input.businessName,
      settlement_bank: input.bankCode,
      account_number: input.accountNumber,
      percentage_charge: input.percentageCharge ?? 0,
      description: input.description,
      metadata: input.metadata,
    }),
  });
  return payload.data;
}

export async function updatePaystackSubaccount(
  code: string,
  input: {
    businessName?: string;
    bankCode?: string;
    accountNumber?: string;
    percentageCharge?: number;
    active?: boolean;
  },
): Promise<PaystackSubaccount> {
  const body: Record<string, unknown> = {};
  if (input.businessName !== undefined) body.business_name = input.businessName;
  if (input.bankCode !== undefined) body.settlement_bank = input.bankCode;
  if (input.accountNumber !== undefined) body.account_number = input.accountNumber;
  if (input.percentageCharge !== undefined) body.percentage_charge = input.percentageCharge;
  if (input.active !== undefined) body.active = input.active;

  const payload = await paystackRequest<PaystackSubaccount>(
    `/subaccount/${encodeURIComponent(code.trim())}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
  return payload.data;
}
