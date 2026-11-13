import { cn } from "@/lib/utils";
import { SERVGO_COLORS } from "@/lib/brand-config";

/** ServGo brand blues */
export const SERVGO_BLUE = SERVGO_COLORS.blue;
export const SERVGO_BLUE_DARK = SERVGO_COLORS.blueDark;
export const SERVGO_NAVY = SERVGO_COLORS.navy;
export const SERVGO_CYAN = SERVGO_COLORS.cyan;

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
  "px-6 py-4 servgo-header-gradient shrink-0 border-b border-white/10 text-white";

export const dashboardTabListClass =
  "w-full h-10 p-1 bg-muted/50 rounded-xl border border-border/60";

export function dashboardTabTriggerClass() {
  return cn(
    "flex-1 rounded-lg text-sm font-medium transition-all",
    "data-[state=active]:bg-[#0066FF] data-[state=active]:text-white data-[state=active]:shadow-sm",
    "data-[state=inactive]:text-muted-foreground",
  );
}

export const dashboardSectionCardClass = "rounded-xl border border-border bg-muted/20 p-4";

export const dashboardPrimaryButtonClass =
  "h-10 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white shadow-sm";

export const dashboardTableRowHoverClass = "hover:bg-[#0066FF]/5";

/** Order workflow status badges — ServGo palette */
export const ORDER_STATUS_STYLES: Record<string, string> = {
  NEW: "bg-[#001F5C]/10 text-[#001F5C] border border-[#001F5C]/15",
  IN_PROGRESS: "bg-amber-500/10 text-amber-700 border border-amber-500/25",
  READY: "bg-[#0066FF]/15 text-[#0052CC] border border-[#0066FF]/30",
  COMPLETED: "bg-[#0066FF]/10 text-[#001F5C] border border-[#0066FF]/25",
  CANCELLED: "bg-red-500/10 text-red-700 border border-red-500/25",
};

export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PAID: "border-[#0066FF]/40 text-[#0052CC] bg-[#0066FF]/8",
  PENDING: "border-amber-500/40 text-amber-700 bg-amber-500/8",
  FAILED: "border-red-500/40 text-red-600 bg-red-500/8",
  REFUNDED: "border-slate-400/40 text-slate-600 bg-slate-500/8",
};

export const NOTIFICATION_CHANNEL_STYLES: Record<string, string> = {
  SMS: "bg-[#001F5C]/8 text-[#001F5C] border border-[#001F5C]/15",
  EMAIL: "bg-slate-500/10 text-slate-700 border border-slate-500/20",
  WHATSAPP: "bg-[#0066FF]/10 text-[#0052CC] border border-[#0066FF]/25",
};

/** User role badges — ServGo palette */
export const ROLE_BADGE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-[#0066FF]/15 text-[#001F5C] border border-[#0066FF]/30",
  ADMIN: "bg-[#0066FF]/10 text-[#0052CC] border border-[#0066FF]/25",
  EXECUTIVE: "bg-[#001F5C]/10 text-[#001F5C] border border-[#001F5C]/15",
  OPERATIONS_MANAGER: "bg-[#001F5C]/10 text-[#001F5C] border border-[#001F5C]/15",
  BRANCH_MANAGER: "bg-amber-500/10 text-amber-700 border border-amber-500/25",
  MANAGER: "bg-amber-500/10 text-amber-700 border border-amber-500/25",
  SUPERVISOR: "bg-amber-500/10 text-amber-700 border border-amber-500/25",
  STAFF: "bg-muted text-muted-foreground border border-border",
  CASHIER: "bg-muted text-muted-foreground border border-border",
  WAITER: "bg-muted text-muted-foreground border border-border",
  KITCHEN_STAFF: "bg-muted text-muted-foreground border border-border",
  WAREHOUSE_STAFF: "bg-muted text-muted-foreground border border-border",
  AUDITOR: "bg-[#001F5C]/10 text-[#001F5C] border border-[#001F5C]/15",
  DEVELOPER: "bg-[#001F5C]/10 text-[#001F5C] border border-[#001F5C]/15",
};

/** Inventory stock level badges */
export const STOCK_STATUS_STYLES: Record<string, string> = {
  critical: "bg-red-500/10 text-red-700 border border-red-500/25",
  low: "bg-amber-500/10 text-amber-700 border border-amber-500/25",
  normal: "bg-[#0066FF]/10 text-[#0052CC] border border-[#0066FF]/25",
  overstock: "bg-[#001F5C]/10 text-[#001F5C] border border-[#001F5C]/15",
};

/** Branch transfer status badges */
export const TRANSFER_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 border border-amber-500/25",
  APPROVED: "bg-[#001F5C]/10 text-[#001F5C] border border-[#001F5C]/15",
  IN_TRANSIT: "bg-[#001F5C]/10 text-[#001F5C] border border-[#001F5C]/15",
  AWAITING_WAREHOUSE_APPROVAL: "bg-amber-500/10 text-amber-700 border border-amber-500/25",
  RECEIVED: "bg-[#0066FF]/10 text-[#0052CC] border border-[#0066FF]/25",
  COMPLETED: "bg-[#0066FF]/10 text-[#001F5C] border border-[#0066FF]/25",
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
    title && "text-base font-semibold text-[#001F5C]",
  );
}
