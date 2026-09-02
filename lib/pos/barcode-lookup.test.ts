import { describe, expect, it } from "vitest";
import { buildSkuLookup, normalizeBarcodeSku, resolveBarcodeScan } from "./barcode-lookup";
import type { PosCartLine, PosMenuItem } from "@/components/pos/pos-types";

const simpleItem: PosMenuItem = {
  id: "item-1",
  name: "Burger",
  sku: "BRG-001",
  category: "Mains",
  price: 25,
};

const optionItem: PosMenuItem = {
  id: "item-2",
  name: "Coffee",
  sku: "COF-001",
  category: "Drinks",
  price: 10,
  optionGroups: [
    {
      id: "grp-1",
      name: "Size",
      minSelections: 1,
      maxSelections: 1,
      options: [{ id: "opt-1", name: "Large", priceAdjustment: 2 }],
    },
  ],
};

describe("normalizeBarcodeSku", () => {
  it("trims and uppercases", () => {
    expect(normalizeBarcodeSku("  brg-001 ")).toBe("BRG-001");
  });
});

describe("buildSkuLookup", () => {
  it("indexes items by normalized sku", () => {
    const lookup = buildSkuLookup([simpleItem]);
    expect(lookup.get("BRG-001")?.id).toBe("item-1");
  });
});

describe("resolveBarcodeScan", () => {
  it("returns not_found for unknown sku", () => {
    const result = resolveBarcodeScan("UNKNOWN", [], buildSkuLookup([simpleItem]));
    expect(result.action).toBe("not_found");
  });

  it("returns add for simple item", () => {
    const result = resolveBarcodeScan("brg-001", [], buildSkuLookup([simpleItem]));
    expect(result).toEqual({ action: "add", item: simpleItem });
  });

  it("returns picker when item has options and cart is empty", () => {
    const result = resolveBarcodeScan("cof-001", [], buildSkuLookup([optionItem]));
    expect(result).toEqual({ action: "picker", item: optionItem });
  });

  it("returns increment when exactly one configured line exists", () => {
    const cart: PosCartLine[] = [
      {
        lineKey: "line-1",
        menuItemId: "item-2",
        name: "Coffee",
        unitPrice: 12,
        quantity: 1,
        menuItemOptionIds: ["opt-1"],
        configurationLabel: "Large",
      },
    ];
    const result = resolveBarcodeScan("COF-001", cart, buildSkuLookup([optionItem]));
    expect(result).toEqual({
      action: "increment",
      lineKey: "line-1",
      item: optionItem,
    });
  });

  it("returns picker when multiple lines exist for same item", () => {
    const cart: PosCartLine[] = [
      {
        lineKey: "line-1",
        menuItemId: "item-2",
        name: "Coffee",
        unitPrice: 10,
        quantity: 1,
        menuItemOptionIds: ["opt-1"],
        configurationLabel: "Small",
      },
      {
        lineKey: "line-2",
        menuItemId: "item-2",
        name: "Coffee",
        unitPrice: 12,
        quantity: 1,
        menuItemOptionIds: ["opt-1"],
        configurationLabel: "Large",
      },
    ];
    const result = resolveBarcodeScan("COF-001", cart, buildSkuLookup([optionItem]));
    expect(result).toEqual({ action: "picker", item: optionItem });
  });
});
