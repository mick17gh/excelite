import { cn } from "@/lib/utils";

/** Excelite brand greens */
export const EXCELITE_GREEN = "#22C55E";
export const EXCELITE_GREEN_DARK = "#16A34A";
export const EXCELITE_CHARCOAL = "#222831";

/** Shared layout classes */
export const dashboardToolbarClass =
  "flex flex-col gap-3 border-b border-border/60 bg-muted/20 px-4 py-3 md:px-5 md:py-4";

/**
 * Pair with dashboardModalHeaderClass. overflow-hidden + matching radius
 * clips the gradient flush to corners (avoids white crescent gaps).
 */
export const dashboardModalContentClass =
  "overflow-hidden p-0 gap-0 sm:rounded-2xl max-h-[min(90vh,900px)] flex flex-col [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100 [&>button]:hover:bg-white/15 [&>button]:ring-offset-0";

/** Gradient header — no own radius; parent DialogContent clips corners. */
export const dashboardModalHeaderClass =
  "px-6 py-4 excelite-header-gradient shrink-0 border-b border-white/10 text-white";

export const dashboardTabListClass =
  "w-full h-10 p-1 bg-muted/50 rounded-xl border border-border/60";

export function dashboardTabTriggerClass() {
  return cn(
    "flex-1 rounded-lg text-sm font-medium transition-all",
    "data-[state=active]:bg-[#22C55E] data-[state=active]:text-white data-[state=active]:shadow-sm",
    "data-[state=inactive]:text-muted-foreground",
  );
}

export const dashboardSectionCardClass = "rounded-xl border border-border bg-muted/20 p-4";

export const dashboardPrimaryButtonClass =
  "h-10 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-sm";

export const dashboardTableRowHoverClass = "hover:bg-[#22C55E]/5";

/** Order workflow status badges — Excelite palette (no blue). */
export const ORDER_STATUS_STYLES: Record<string, string> = {
  NEW: "bg-[#222831]/10 text-[#222831] border border-[#222831]/15",
  IN_PROGRESS: "bg-amber-500/10 text-amber-700 border border-amber-500/25",
  READY: "bg-[#22C55E]/15 text-[#16A34A] border border-[#22C55E]/30",
  COMPLETED: "bg-[#22C55E]/10 text-[#15803D] border border-[#22C55E]/25",
  CANCELLED: "bg-red-500/10 text-red-700 border border-red-500/25",
};

export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PAID: "border-[#22C55E]/40 text-[#16A34A] bg-[#22C55E]/8",
  PENDING: "border-amber-500/40 text-amber-700 bg-amber-500/8",
  FAILED: "border-red-500/40 text-red-600 bg-red-500/8",
  REFUNDED: "border-slate-400/40 text-slate-600 bg-slate-500/8",
};

export const NOTIFICATION_CHANNEL_STYLES: Record<string, string> = {
  SMS: "bg-[#222831]/8 text-[#222831] border border-[#222831]/15",
  EMAIL: "bg-slate-500/10 text-slate-700 border border-slate-500/20",
  WHATSAPP: "bg-[#22C55E]/10 text-[#16A34A] border border-[#22C55E]/25",
};

/** User role badges — Excelite palette (no blue/rainbow) */
export const ROLE_BADGE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-[#22C55E]/15 text-[#15803D] border border-[#22C55E]/30",
  ADMIN: "bg-[#22C55E]/10 text-[#16A34A] border border-[#22C55E]/25",
  EXECUTIVE: "bg-[#222831]/10 text-[#222831] border border-[#222831]/15",
  OPERATIONS_MANAGER: "bg-[#222831]/10 text-[#222831] border border-[#222831]/15",
  BRANCH_MANAGER: "bg-amber-500/10 text-amber-700 border border-amber-500/25",
  MANAGER: "bg-amber-500/10 text-amber-700 border border-amber-500/25",
  SUPERVISOR: "bg-amber-500/10 text-amber-700 border border-amber-500/25",
  STAFF: "bg-muted text-muted-foreground border border-border",
  CASHIER: "bg-muted text-muted-foreground border border-border",
  WAITER: "bg-muted text-muted-foreground border border-border",
  KITCHEN_STAFF: "bg-muted text-muted-foreground border border-border",
  WAREHOUSE_STAFF: "bg-muted text-muted-foreground border border-border",
  AUDITOR: "bg-[#222831]/10 text-[#222831] border border-[#222831]/15",
  DEVELOPER: "bg-[#222831]/10 text-[#222831] border border-[#222831]/15",
};

/** Inventory stock level badges */
export const STOCK_STATUS_STYLES: Record<string, string> = {
  critical: "bg-red-500/10 text-red-700 border border-red-500/25",
  low: "bg-amber-500/10 text-amber-700 border border-amber-500/25",
  normal: "bg-[#22C55E]/10 text-[#16A34A] border border-[#22C55E]/25",
  overstock: "bg-[#222831]/10 text-[#222831] border border-[#222831]/15",
};

/** Branch transfer status badges */
export const TRANSFER_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 border border-amber-500/25",
  APPROVED: "bg-[#222831]/10 text-[#222831] border border-[#222831]/15",
  IN_TRANSIT: "bg-[#222831]/10 text-[#222831] border border-[#222831]/15",
  AWAITING_WAREHOUSE_APPROVAL: "bg-amber-500/10 text-amber-700 border border-amber-500/25",
  RECEIVED: "bg-[#22C55E]/10 text-[#16A34A] border border-[#22C55E]/25",
  COMPLETED: "bg-[#22C55E]/10 text-[#15803D] border border-[#22C55E]/25",
  CANCELLED: "bg-red-500/10 text-red-700 border border-red-500/25",
};

export function orderStatusBadgeClass(status: string) {
  return cn(
    "font-medium border-0 text-xs",
    ORDER_STATUS_STYLES[status] ?? "bg-muted text-muted-foreground",
  );
}

export function paymentStatusBadgeClass(status: string) {
  return cn(
    "font-medium",
    PAYMENT_STATUS_STYLES[status] ?? PAYMENT_STATUS_STYLES.PENDING,
  );
}

export function roleBadgeClass(role: string) {
  return cn(
    "font-medium border-0 text-xs",
    ROLE_BADGE_STYLES[role] ?? "bg-muted text-muted-foreground",
  );
}

export function stockStatusBadgeClass(status: string) {
  return cn(
    "font-medium border-0 text-xs capitalize",
    STOCK_STATUS_STYLES[status] ?? "bg-muted text-muted-foreground",
  );
}

export function transferStatusBadgeClass(status: string) {
  return cn(
    "font-medium border-0 text-xs",
    TRANSFER_STATUS_STYLES[status] ?? "bg-muted text-muted-foreground",
  );
}

export function dashboardSectionHeaderClass(title?: string) {
  return cn(
    "flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-muted/20",
    title && "text-base font-semibold text-[#222831]",
  );
}
