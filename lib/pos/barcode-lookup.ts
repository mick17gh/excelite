import type { PosCartLine, PosMenuItem } from "@/components/pos/pos-types";

export type BarcodeScanResult =
  | { action: "add"; item: PosMenuItem }
  | { action: "picker"; item: PosMenuItem }
  | { action: "increment"; lineKey: string; item: PosMenuItem }
  | { action: "not_found" };

export function normalizeBarcodeSku(raw: string): string {
  return raw.trim().toUpperCase();
}

export function buildSkuLookup(items: PosMenuItem[]): Map<string, PosMenuItem> {
  const lookup = new Map<string, PosMenuItem>();
  for (const item of items) {
    const sku = item.sku?.trim();
    if (!sku) continue;
    lookup.set(normalizeBarcodeSku(sku), item);
  }
  return lookup;
}

export function resolveBarcodeScan(
  rawSku: string,
  cart: PosCartLine[],
  lookup: Map<string, PosMenuItem>,
): BarcodeScanResult {
  const key = normalizeBarcodeSku(rawSku);
  if (!key) return { action: "not_found" };

  const item = lookup.get(key);
  if (!item) return { action: "not_found" };

  const hasOptions = Boolean(item.optionGroups?.length);
  if (!hasOptions) {
    return { action: "add", item };
  }

  const linesForItem = cart.filter((line) => line.menuItemId === item.id);
  if (linesForItem.length === 0) {
    return { action: "picker", item };
  }
  if (linesForItem.length === 1) {
    return { action: "increment", lineKey: linesForItem[0].lineKey, item };
  }
  return { action: "picker", item };
}
