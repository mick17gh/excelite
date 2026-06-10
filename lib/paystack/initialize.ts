export type PaystackInitializeSplitInput = {
  email: string;
  amount: number;
  reference: string;
  callbackUrl?: string;
  currency: string;
  metadata: Record<string, unknown>;
  subaccountCode?: string | null;
};

export function buildPaystackInitializeBody(input: PaystackInitializeSplitInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    email: input.email,
    amount: input.amount,
    reference: input.reference,
    currency: input.currency,
    metadata: input.metadata,
  };

  if (input.callbackUrl) {
    body.callback_url = input.callbackUrl;
  }

  if (input.subaccountCode) {
    body.subaccount = input.subaccountCode;
    body.bearer = "subaccount";
  }

  return body;
}

export function branchHasPaystackSettlement(
  branch: { paystackSubaccountCode?: string | null; paystackSubaccountActive?: boolean | null },
): boolean {
  return Boolean(
    branch.paystackSubaccountCode?.trim() &&
      (branch.paystackSubaccountActive === null ||
        branch.paystackSubaccountActive === undefined ||
        branch.paystackSubaccountActive === true),
  );
}
