import { describe, expect, it } from "vitest";
import {
  branchHasPaystackSettlement,
  buildPaystackInitializeBody,
} from "./initialize";

describe("buildPaystackInitializeBody", () => {
  it("includes subaccount and bearer when code is provided", () => {
    const body = buildPaystackInitializeBody({
      email: "a@b.com",
      amount: 4000,
      reference: "PSTK-1",
      currency: "GHS",
      subaccountCode: "ACCT_test123",
      metadata: { orderId: "o1" },
    });

    expect(body).toMatchObject({
      email: "a@b.com",
      amount: 4000,
      subaccount: "ACCT_test123",
      bearer: "subaccount",
    });
  });

  it("omits subaccount when not configured", () => {
    const body = buildPaystackInitializeBody({
      email: "a@b.com",
      amount: 4000,
      reference: "PSTK-1",
      currency: "GHS",
      metadata: { orderId: "o1" },
    });

    expect(body.subaccount).toBeUndefined();
    expect(body.bearer).toBeUndefined();
  });
});

describe("branchHasPaystackSettlement", () => {
  it("returns true for active linked subaccount", () => {
    expect(
      branchHasPaystackSettlement({
        paystackSubaccountCode: "ACCT_abc",
        paystackSubaccountActive: true,
      }),
    ).toBe(true);
  });

  it("returns false when code missing", () => {
    expect(branchHasPaystackSettlement({ paystackSubaccountCode: null })).toBe(false);
  });

  it("returns false when subaccount inactive", () => {
    expect(
      branchHasPaystackSettlement({
        paystackSubaccountCode: "ACCT_abc",
        paystackSubaccountActive: false,
      }),
    ).toBe(false);
  });
});
