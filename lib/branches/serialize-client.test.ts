import { describe, expect, it } from "vitest";
import {
  pickBranchListItem,
  serializeBranchScalarsForClient,
} from "./serialize-client";

function mockDecimal(value: number) {
  return {
    toNumber: () => value,
    toString: () => String(value),
  };
}

function mockBranch(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-01-15T12:00:00.000Z");
  return {
    id: "b1",
    name: "Main",
    code: "MAIN",
    address: "1 St",
    city: "Accra",
    state: null,
    country: "GH",
    currency: "GHS",
    phone: null,
    email: null,
    latitude: mockDecimal(5.6037),
    longitude: mockDecimal(-0.187),
    timezone: "Africa/Accra",
    isActive: true,
    onlineStoreVisible: false,
    openingDate: now,
    requiredStaff: 5,
    seatCount: null,
    taxRate: mockDecimal(12.5),
    taxName: "VAT",
    taxEnabled: true,
    taxInclusive: false,
    showTaxOnReceipt: true,
    taxNumber: null,
    showTaxNumberOnReceipt: false,
    blockSalesWhenOutOfStock: null,
    tableServiceEnabled: false,
    paystackSubaccountCode: "ACCT_test",
    paystackSubaccountId: 1,
    settlementBankCode: null,
    settlementAccountNumber: null,
    settlementAccountName: null,
    paystackPercentageCharge: mockDecimal(0),
    paystackSubaccountActive: true,
    paystackSubaccountSyncedAt: now,
    paystackSubaccountSource: "linked",
    organizationId: "org1",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  } as never;
}

describe("serializeBranchScalarsForClient", () => {
  it("converts Decimal-like fields to plain numbers", () => {
    const result = serializeBranchScalarsForClient(mockBranch());

    expect(typeof result.taxRate).toBe("number");
    expect(result.taxRate).toBe(12.5);
    expect(typeof result.latitude).toBe("number");
    expect(typeof result.longitude).toBe("number");
    expect(typeof result.paystackPercentageCharge).toBe("number");
    expect(result.paystackPercentageCharge).toBe(0);
    expect(result.createdAt).toBe("2026-01-15T12:00:00.000Z");
  });

  it("round-trips as JSON without Decimal constructors", () => {
    const result = serializeBranchScalarsForClient(mockBranch());
    const json = JSON.parse(JSON.stringify(result));

    expect(json.taxRate).toBe(12.5);
    expect(json.paystackPercentageCharge).toBe(0);
    expect(json.latitude).toBeCloseTo(5.6037);
  });
});

describe("pickBranchListItem", () => {
  it("returns only list-safe scalar fields", () => {
    const branch = serializeBranchScalarsForClient(mockBranch());
    const item = pickBranchListItem(branch);

    expect(item).toEqual({
      id: "b1",
      name: "Main",
      code: "MAIN",
      city: "Accra",
      isActive: true,
      currency: "GHS",
    });
    expect("taxRate" in item).toBe(false);
    expect("paystackPercentageCharge" in item).toBe(false);
  });
});
