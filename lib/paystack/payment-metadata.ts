import type { Prisma } from "@/lib/generated/prisma/client";

/** Normalize Paystack verify/webhook payload for Payment.metadata storage. */
export function buildPaystackPaymentMetadata(
  data: Record<string, unknown>,
): Prisma.InputJsonValue {
  const orderMetadata =
    data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, unknown>)
      : {};

  return {
    ...data,
    split: data.split ?? null,
    branchId: orderMetadata.branchId ?? null,
    subaccount: data.subaccount ?? orderMetadata.subaccount ?? null,
  } as Prisma.InputJsonValue;
}
