export type StorefrontCartOption = {
  optionId: string;
  name: string;
  priceDelta: number;
};

export type StorefrontCartLine = {
  key: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  options: StorefrontCartOption[];
  notes?: string;
};

const PREFIX = "servgo-storefront-cart:";
const LEGACY_PREFIX = "excelite-storefront-cart:";

function storageKey(organizationId: string): string {
  return `${PREFIX}${organizationId}`;
}

function legacyStorageKey(organizationId: string): string {
  return `${LEGACY_PREFIX}${organizationId}`;
}

export function loadStorefrontCart(organizationId: string): StorefrontCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const key = storageKey(organizationId);
    let raw = localStorage.getItem(key);
    if (!raw) {
      const legacy = localStorage.getItem(legacyStorageKey(organizationId));
      if (legacy) {
        raw = legacy;
        localStorage.setItem(key, legacy);
        localStorage.removeItem(legacyStorageKey(organizationId));
      }
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StorefrontCartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStorefrontCart(organizationId: string, lines: StorefrontCartLine[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(organizationId), JSON.stringify(lines));
  localStorage.removeItem(legacyStorageKey(organizationId));
}

export function clearStorefrontCart(organizationId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(organizationId));
  localStorage.removeItem(legacyStorageKey(organizationId));
}

export function cartLineKey(menuItemId: string, optionIds: string[]): string {
  return `${menuItemId}:${[...optionIds].sort().join(",")}`;
}

export function lineUnitTotal(line: StorefrontCartLine): number {
  const deltas = line.options.reduce((sum, opt) => sum + opt.priceDelta, 0);
  return line.unitPrice + deltas;
}

export function cartItemsSubtotal(lines: StorefrontCartLine[]): number {
  return lines.reduce((sum, line) => sum + lineUnitTotal(line) * line.quantity, 0);
}
