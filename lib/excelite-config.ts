/** Excelite POS product configuration — lite standalone brand */

const SUPPORT_PHONE_E164 = "233554510864";
const WHATSAPP_INTRO_MESSAGE =
  "Hi Excelite, I'd like to learn more about Excelite POS.";

export const EXCELITE_BRAND = {
  name: "Excelite POS",
  shortName: "Excelite",
  tagline: "Run Your Business. Know Your Numbers.",
  logo: "/excelite_logo.png",
  themeColor: "#22C55E",
  supportEmail: process.env.NEXT_PUBLIC_SALES_EMAIL ?? "support@excelite.app",
  /** Primary contact phone (WhatsApp / call) */
  supportPhone: "+233554510864",
  supportPhoneTel: "tel:+233554510864",
  supportPhoneDisplay: "+233 55 451 0864",
  /** WhatsApp chat with prefilled intro message */
  supportWhatsAppUrl: `https://wa.me/${SUPPORT_PHONE_E164}?text=${encodeURIComponent(WHATSAPP_INTRO_MESSAGE)}`,
} as const;

/** Paths not available in Excelite lite (SUPER_ADMIN may still access for support) */
export const LITE_BLOCKED_PATH_MATCHERS: ((pathname: string) => boolean)[] = [
  (p) => p === "/kitchen" || p.startsWith("/kitchen/"),
  (p) => p === "/dashboard/transactions" || p.startsWith("/dashboard/transactions/"),
  (p) => p === "/dashboard/branches" || p.startsWith("/dashboard/branches/"),
  (p) => p === "/dashboard/tables" || p.startsWith("/dashboard/tables/"),
  (p) => p === "/dashboard/sales" || p.startsWith("/dashboard/sales/"),
  (p) => p === "/dashboard/warehouse" || p.startsWith("/dashboard/warehouse/"),
  (p) => p === "/dashboard/customers" || p.startsWith("/dashboard/customers/"),
  (p) => p === "/dashboard/suppliers" || p.startsWith("/dashboard/suppliers/"),
  (p) => p === "/dashboard/delivery" || p.startsWith("/dashboard/delivery/"),
  (p) => p === "/dashboard/targets" || p.startsWith("/dashboard/targets/"),
  (p) => p === "/dashboard/staff" || p.startsWith("/dashboard/staff/"),
  (p) => p === "/dashboard/alerts" || p.startsWith("/dashboard/alerts/"),
  (p) => p === "/dashboard/api-keys" || p.startsWith("/dashboard/api-keys/"),
];

export function isLiteBlockedPath(pathname: string): boolean {
  return LITE_BLOCKED_PATH_MATCHERS.some((match) => match(pathname));
}

/** Roles shown in user management and permission matrix for lite */
export const LITE_ASSIGNABLE_ROLES = ["ADMIN", "BRANCH_MANAGER", "STAFF"] as const;

export const LITE_ROLE_LABELS: Record<(typeof LITE_ASSIGNABLE_ROLES)[number], string> = {
  ADMIN: "Owner",
  BRANCH_MANAGER: "Manager",
  STAFF: "Cashier",
};

/** Permission groups visible in Team Permissions tab */
export const LITE_PERMISSION_GROUP_KEYS = [
  "dashboard",
  "operations",
  "menu",
  "inventory",
  "reports",
  "settings",
  "users",
] as const;
