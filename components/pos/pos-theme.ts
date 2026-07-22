import type { LucideIcon } from "lucide-react";
import { Package, Truck, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

export const POS_BRAND = {
  charcoal: "#222831",
  green: "#22C55E",
  greenDark: "#16A34A",
  surface: "#F8FAF8",
} as const;

export type PosOrderTypeValue = "DINE_IN" | "TAKEOUT" | "DELIVERY";

export const posOrderTypes: {
  value: PosOrderTypeValue;
  label: string;
  icon: LucideIcon;
  chipClass: string;
}[] = [
  {
    value: "DINE_IN",
    label: "Dine-in",
    icon: UtensilsCrossed,
    chipClass: "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#16A34A]",
  },
  {
    value: "TAKEOUT",
    label: "Takeout",
    icon: Package,
    chipClass: "border-[#222831]/20 bg-[#222831]/5 text-[#222831]",
  },
  {
    value: "DELIVERY",
    label: "Delivery",
    icon: Truck,
    chipClass: "border-[#16A34A]/30 bg-[#16A34A]/10 text-[#16A34A]",
  },
];

export const posToolbarClass =
  "flex flex-col gap-3 border-b border-border/60 bg-muted/20 px-3 py-3 md:px-4 md:py-3.5 shrink-0";

export const posBranchSelectorWrapperClass =
  "flex items-center gap-2.5 rounded-xl border border-[#22C55E]/20 bg-card px-2.5 py-1.5 shadow-sm min-w-0";

export const posBranchIconClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#22C55E]/10 text-[#16A34A]";

export const posBranchSelectTriggerClass =
  "h-9 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus:ring-0 font-medium text-[#222831]";

export const posOrderTypeTabListClass =
  "inline-flex h-11 items-center gap-0.5 rounded-xl border border-border/60 bg-muted/40 p-1";

export function posOrderTypeButtonClass(active: boolean) {
  return cn(
    "h-9 gap-2 rounded-lg px-3.5 text-sm font-medium transition-all",
    active
      ? "bg-[#22C55E] text-white shadow-sm shadow-[#22C55E]/25"
      : "text-muted-foreground hover:bg-background hover:text-foreground",
  );
}

export function posCategoryChipClass(active: boolean) {
  return cn(
    "shrink-0 h-9 cursor-pointer rounded-full border px-4 text-sm font-medium transition-all",
    active
      ? "border-[#22C55E]/35 bg-[#22C55E] text-white shadow-sm"
      : "border-border bg-background text-muted-foreground hover:border-[#22C55E]/25 hover:text-foreground",
  );
}

export function posProductCardClass(options: { active: boolean; disabled: boolean }) {
  return cn(
    "group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-2.5 text-left transition-all duration-200",
    "hover:-translate-y-0.5 hover:border-[#22C55E]/40 hover:shadow-md active:scale-[0.98]",
    options.active && "border-[#22C55E]/50 ring-2 ring-[#22C55E]/35 shadow-md shadow-[#22C55E]/10",
    options.disabled && "cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-none hover:border-border",
  );
}

export const posModalHeaderClass =
  "border-b border-white/10 excelite-header-gradient text-white px-6 py-4 rounded-t-2xl";

export const posPanelHeaderClass =
  "excelite-header-gradient text-white shrink-0 border-b border-white/10";

export const posPanelClass = "rounded-2xl border border-border bg-card shadow-sm overflow-hidden";

export const posSectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
