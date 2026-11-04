import type { LucideIcon } from "lucide-react";
import { Package, ShoppingBag, Truck, UtensilsCrossed } from "lucide-react";

export type BusinessMode = "RETAIL" | "RESTAURANT";

export type PosOrderTypeValue = "DINE_IN" | "TAKEOUT" | "DELIVERY";

export type PosOrderTypeOption = {
  value: PosOrderTypeValue;
  label: string;
  icon: LucideIcon;
  chipClass: string;
};

const DINE_IN: PosOrderTypeOption = {
  value: "DINE_IN",
  label: "Dine-in",
  icon: UtensilsCrossed,
  chipClass: "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#16A34A]",
};

const TAKEOUT: PosOrderTypeOption = {
  value: "TAKEOUT",
  label: "Takeout",
  icon: Package,
  chipClass: "border-[#222831]/20 bg-[#222831]/5 text-[#222831]",
};

const SALE: PosOrderTypeOption = {
  value: "TAKEOUT",
  label: "Sale",
  icon: ShoppingBag,
  chipClass: "border-[#222831]/20 bg-[#222831]/5 text-[#222831]",
};

const DELIVERY: PosOrderTypeOption = {
  value: "DELIVERY",
  label: "Delivery",
  icon: Truck,
  chipClass: "border-[#16A34A]/30 bg-[#16A34A]/10 text-[#16A34A]",
};

/** All restaurant POS order types (legacy default list). */
export const RESTAURANT_POS_ORDER_TYPES: PosOrderTypeOption[] = [DINE_IN, TAKEOUT, DELIVERY];

export function normalizeBusinessMode(value: string | null | undefined): BusinessMode {
  return value === "RETAIL" ? "RETAIL" : "RESTAURANT";
}

export function getDefaultPosOrderType(mode: BusinessMode): PosOrderTypeValue {
  return mode === "RETAIL" ? "TAKEOUT" : "DINE_IN";
}

export function getPosOrderTypesForMode(mode: BusinessMode): PosOrderTypeOption[] {
  if (mode === "RETAIL") {
    return [SALE, DELIVERY];
  }
  return RESTAURANT_POS_ORDER_TYPES;
}

/** If current type is invalid for the mode (e.g. DINE_IN on retail), return the default. */
export function coercePosOrderType(
  mode: BusinessMode,
  orderType: string,
): PosOrderTypeValue {
  const allowed = getPosOrderTypesForMode(mode).map((o) => o.value);
  if (allowed.includes(orderType as PosOrderTypeValue)) {
    return orderType as PosOrderTypeValue;
  }
  return getDefaultPosOrderType(mode);
}
