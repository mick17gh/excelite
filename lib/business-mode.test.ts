import { describe, expect, it } from "vitest";
import {
  coercePosOrderType,
  getDefaultPosOrderType,
  getPosOrderTypesForMode,
  normalizeBusinessMode,
} from "./business-mode";

describe("business-mode", () => {
  it("normalizes unknown values to RESTAURANT", () => {
    expect(normalizeBusinessMode(undefined)).toBe("RESTAURANT");
    expect(normalizeBusinessMode("RETAIL")).toBe("RETAIL");
  });

  it("defaults order type by mode", () => {
    expect(getDefaultPosOrderType("RETAIL")).toBe("TAKEOUT");
    expect(getDefaultPosOrderType("RESTAURANT")).toBe("DINE_IN");
  });

  it("retail POS shows Sale + Delivery, no dine-in", () => {
    const types = getPosOrderTypesForMode("RETAIL");
    expect(types.map((t) => t.value)).toEqual(["TAKEOUT", "DELIVERY"]);
    expect(types[0].label).toBe("Sale");
    expect(types.some((t) => t.value === "DINE_IN")).toBe(false);
  });

  it("restaurant POS shows dine-in, takeout, delivery", () => {
    expect(getPosOrderTypesForMode("RESTAURANT").map((t) => t.value)).toEqual([
      "DINE_IN",
      "TAKEOUT",
      "DELIVERY",
    ]);
  });

  it("coerces invalid retail dine-in to sale/takeout", () => {
    expect(coercePosOrderType("RETAIL", "DINE_IN")).toBe("TAKEOUT");
    expect(coercePosOrderType("RETAIL", "DELIVERY")).toBe("DELIVERY");
    expect(coercePosOrderType("RESTAURANT", "TAKEOUT")).toBe("TAKEOUT");
  });
});
