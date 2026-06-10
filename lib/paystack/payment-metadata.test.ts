import { describe, expect, it } from "vitest";
import { buildPaystackPaymentMetadata } from "./payment-metadata";

describe("buildPaystackPaymentMetadata", () => {
  it("preserves split and branchId from verify payload", () => {
    const metadata = buildPaystackPaymentMetadata({
      id: 123,
      reference: "PSTK-1",
      metadata: { branchId: "branch-1", orderId: "order-1" },
      split: { subaccount: "ACCT_abc", amount: 4000 },
    });

    expect(metadata).toMatchObject({
      id: 123,
      split: { subaccount: "ACCT_abc", amount: 4000 },
      branchId: "branch-1",
    });
  });
});
