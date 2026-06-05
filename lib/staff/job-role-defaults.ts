import type { ShiftTemplate, StaffJobRoleCategory } from "@/lib/generated/prisma/client";

export interface DefaultStaffJobRole {
  name: string;
  code: string;
  category: StaffJobRoleCategory;
  sortOrder: number;
  defaultShiftTemplate?: ShiftTemplate;
}

export const DEFAULT_STAFF_JOB_ROLES: DefaultStaffJobRole[] = [
  // Management
  { name: "Manager", code: "MANAGER", category: "MANAGEMENT", sortOrder: 10, defaultShiftTemplate: "FULL" },
  { name: "Assistant Manager", code: "ASSISTANT_MANAGER", category: "MANAGEMENT", sortOrder: 20, defaultShiftTemplate: "FULL" },
  { name: "Supervisor", code: "SUPERVISOR", category: "MANAGEMENT", sortOrder: 30, defaultShiftTemplate: "FULL" },
  { name: "Shift Leader", code: "SHIFT_LEADER", category: "MANAGEMENT", sortOrder: 40, defaultShiftTemplate: "FULL" },
  // Kitchen
  { name: "Head Chef", code: "HEAD_CHEF", category: "KITCHEN", sortOrder: 50, defaultShiftTemplate: "MORNING" },
  { name: "Sous Chef", code: "SOUS_CHEF", category: "KITCHEN", sortOrder: 60, defaultShiftTemplate: "MORNING" },
  { name: "Kitchen Staff", code: "KITCHEN", category: "KITCHEN", sortOrder: 70, defaultShiftTemplate: "MORNING" },
  { name: "Line Cook", code: "LINE_COOK", category: "KITCHEN", sortOrder: 80, defaultShiftTemplate: "MORNING" },
  { name: "Prep Cook", code: "PREP_COOK", category: "KITCHEN", sortOrder: 90, defaultShiftTemplate: "MORNING" },
  { name: "Dishwasher", code: "DISHWASHER", category: "KITCHEN", sortOrder: 100, defaultShiftTemplate: "MORNING" },
  { name: "Expeditor", code: "EXPEDITOR", category: "KITCHEN", sortOrder: 110, defaultShiftTemplate: "MORNING" },
  // Front of house
  { name: "Server", code: "SERVICE", category: "FRONT_OF_HOUSE", sortOrder: 120, defaultShiftTemplate: "EVENING" },
  { name: "Host", code: "HOST", category: "FRONT_OF_HOUSE", sortOrder: 130, defaultShiftTemplate: "EVENING" },
  { name: "Bartender", code: "BARTENDER", category: "FRONT_OF_HOUSE", sortOrder: 140, defaultShiftTemplate: "EVENING" },
  { name: "Barista", code: "BARISTA", category: "FRONT_OF_HOUSE", sortOrder: 150, defaultShiftTemplate: "MORNING" },
  { name: "Cashier", code: "CASHIER", category: "FRONT_OF_HOUSE", sortOrder: 160, defaultShiftTemplate: "EVENING" },
  { name: "Sommelier", code: "SOMMELIER", category: "FRONT_OF_HOUSE", sortOrder: 170, defaultShiftTemplate: "EVENING" },
  { name: "Catering Staff", code: "CATERING", category: "FRONT_OF_HOUSE", sortOrder: 180, defaultShiftTemplate: "EVENING" },
  // Operations
  { name: "Delivery Driver", code: "DELIVERY", category: "OPERATIONS", sortOrder: 190, defaultShiftTemplate: "EVENING" },
  { name: "Cleaner", code: "CLEANER", category: "OPERATIONS", sortOrder: 200 },
  { name: "Maintenance", code: "MAINTENANCE", category: "OPERATIONS", sortOrder: 210 },
  { name: "Security", code: "SECURITY", category: "OPERATIONS", sortOrder: 220 },
  // Corporate
  { name: "Human Resources", code: "HR", category: "CORPORATE", sortOrder: 230, defaultShiftTemplate: "FULL" },
  { name: "Office Admin", code: "OFFICE_ADMIN", category: "CORPORATE", sortOrder: 240, defaultShiftTemplate: "FULL" },
  { name: "Accountant", code: "ACCOUNTANT", category: "CORPORATE", sortOrder: 250, defaultShiftTemplate: "FULL" },
  { name: "Receptionist", code: "RECEPTIONIST", category: "CORPORATE", sortOrder: 260, defaultShiftTemplate: "FULL" },
  { name: "Marketing", code: "MARKETING", category: "CORPORATE", sortOrder: 270, defaultShiftTemplate: "FULL" },
  { name: "Sales", code: "SALES", category: "CORPORATE", sortOrder: 280, defaultShiftTemplate: "FULL" },
  { name: "Operations", code: "OPERATIONS", category: "CORPORATE", sortOrder: 290, defaultShiftTemplate: "FULL" },
  { name: "Customer Service", code: "CUSTOMER_SERVICE", category: "CORPORATE", sortOrder: 300, defaultShiftTemplate: "FULL" },
  { name: "IT Support", code: "IT_SUPPORT", category: "CORPORATE", sortOrder: 310, defaultShiftTemplate: "FULL" },
  { name: "Procurement", code: "PROCUREMENT", category: "CORPORATE", sortOrder: 320, defaultShiftTemplate: "FULL" },
  { name: "Executive Assistant", code: "EXECUTIVE_ASSISTANT", category: "CORPORATE", sortOrder: 330, defaultShiftTemplate: "FULL" },
];

export const STAFF_JOB_ROLE_CATEGORY_LABELS: Record<StaffJobRoleCategory, string> = {
  MANAGEMENT: "Management",
  KITCHEN: "Kitchen",
  FRONT_OF_HOUSE: "Frontline",
  OPERATIONS: "Operations",
  CORPORATE: "Corporate",
};

export function staffJobRoleComboboxOptions<
  T extends { id: string; name: string; code: string; category: StaffJobRoleCategory | null },
>(roles: T[], valueKey: "id" | "code" = "id") {
  const categoryOrder: StaffJobRoleCategory[] = [
    "MANAGEMENT",
    "KITCHEN",
    "FRONT_OF_HOUSE",
    "OPERATIONS",
    "CORPORATE",
  ];

  return [...roles]
    .sort((a, b) => {
      const aIdx = a.category ? categoryOrder.indexOf(a.category) : 99;
      const bIdx = b.category ? categoryOrder.indexOf(b.category) : 99;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return a.name.localeCompare(b.name);
    })
    .map((role) => ({
      value: valueKey === "id" ? role.id : role.code,
      label: role.name,
      description: role.category
        ? STAFF_JOB_ROLE_CATEGORY_LABELS[role.category]
        : undefined,
    }));
}

export const SHIFT_TEMPLATE_LABELS: Record<ShiftTemplate, string> = {
  MORNING: "Morning shift",
  EVENING: "Evening shift",
  FULL: "Full day",
};
