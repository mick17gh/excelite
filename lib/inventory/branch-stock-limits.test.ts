import { describe, expect, it } from "vitest";
import {
  branchLimitsFromWarehouseItem,
  normalizeWarehouseMaxStock,
  resolveBranchMaxStock,
} from "./branch-stock-limits";

describe("resolveBranchMaxStock", () => {
  it("uses explicit maxStock when set", () => {
    expect(resolveBranchMaxStock({ maxStock: 75, reorderPoint: 15 })).toBe(75);
  });

  it("falls back to reorderPoint x 5", () => {
    expect(resolveBranchMaxStock({ maxStock: null, reorderPoint: 15 })).toBe(75);
  });

  it("falls back to 100 when reorder is zero", () => {
    expect(resolveBranchMaxStock({ maxStock: 0, reorderPoint: 0 })).toBe(100);
  });
});

describe("normalizeWarehouseMaxStock", () => {
  it("returns null for empty or zero", () => {
    expect(normalizeWarehouseMaxStock(null)).toBeNull();
    expect(normalizeWarehouseMaxStock(0)).toBeNull();
    expect(normalizeWarehouseMaxStock(undefined)).toBeNull();
  });

  it("returns positive values", () => {
    expect(normalizeWarehouseMaxStock(50)).toBe(50);
  });
});

describe("branchLimitsFromWarehouseItem", () => {
  it("derives all limits", () => {
    expect(
      branchLimitsFromWarehouseItem({
        minStock: 5,
        reorderPoint: 15,
        maxStock: 80,
      }),
    ).toEqual({ minStock: 5, reorderPoint: 15, maxStock: 80 });
  });
});
