import { SubscriptionTier, Role } from "@/lib/generated/prisma/client";

export function isSuperAdmin(role: Role | undefined | null): boolean {
  return role === "SUPER_ADMIN";
}

export interface TierLimits {
  maxBranches: number;
  maxUsers: number;
  maxMenuItems: number | null;
  maxWarehouses: number;
  features: TierFeatures;
}

export interface TierFeatures {
  pos: boolean;
  kitchenDisplay: boolean;
  inventory: boolean;
  warehouse: boolean;
  salesAnalytics: boolean;
  advancedReports: boolean;
  staffManagement: boolean;
  staffScheduling: boolean;
  targets: boolean;
  alerts: boolean;
  apiAccess: boolean;
  aiAssistant: boolean;
  callCenter: boolean;
  onlineOrdering: boolean;
  whatsappOrdering: boolean;
  delivery: boolean;
  crm: boolean;
  multiCurrency: boolean;
  customBranding: boolean;
  auditLogs: boolean;
  bulkImport: boolean;
  smsNotifications: boolean;
  emailNotifications: boolean;
}

export const TIER_CONFIG: Record<SubscriptionTier, TierLimits> = {
  FREE: {
    maxBranches: 1,
    maxUsers: 2,
    maxMenuItems: 50,
    maxWarehouses: 1,
    features: {
      pos: true,
      kitchenDisplay: true,
      inventory: true,
      warehouse: true,
      salesAnalytics: true,
      advancedReports: false,
      staffManagement: true,
      staffScheduling: false,
      targets: true,
      alerts: true,
      apiAccess: false,
      aiAssistant: false,
      callCenter: false,
      onlineOrdering: false,
      whatsappOrdering: false,
      delivery: false,
      crm: true,
      multiCurrency: false,
      customBranding: false,
      auditLogs: false,
      bulkImport: false,
      smsNotifications: false,
      emailNotifications: false,
    },
  },
  PRO: {
    maxBranches: 10,
    maxUsers: 50,
    maxMenuItems: null,
    maxWarehouses: 3,
    features: {
      pos: true,
      kitchenDisplay: true,
      inventory: true,
      warehouse: true,
      salesAnalytics: true,
      advancedReports: true,
      staffManagement: true,
      staffScheduling: true,
      targets: true,
      alerts: true,
      apiAccess: true,
      aiAssistant: true,
      callCenter: true,
      onlineOrdering: true,
      whatsappOrdering: false,
      delivery: true,
      crm: true,
      multiCurrency: true,
      customBranding: false,
      auditLogs: true,
      bulkImport: true,
      smsNotifications: true,
      emailNotifications: true,
    },
  },
  ENTERPRISE: {
    maxBranches: Infinity,
    maxUsers: Infinity,
    maxMenuItems: null,
    maxWarehouses: Infinity,
    features: {
      pos: true,
      kitchenDisplay: true,
      inventory: true,
      warehouse: true,
      salesAnalytics: true,
      advancedReports: true,
      staffManagement: true,
      staffScheduling: true,
      targets: true,
      alerts: true,
      apiAccess: true,
      aiAssistant: true,
      callCenter: true,
      onlineOrdering: true,
      whatsappOrdering: true,
      delivery: true,
      crm: true,
      multiCurrency: true,
      customBranding: true,
      auditLogs: true,
      bulkImport: true,
      smsNotifications: true,
      emailNotifications: true,
    },
  },
};

export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_CONFIG[tier];
}

export function hasFeature(
  tier: SubscriptionTier,
  feature: keyof TierFeatures,
  userRole?: Role | null
): boolean {
  // SUPER_ADMIN bypasses all tier restrictions
  if (isSuperAdmin(userRole)) {
    return true;
  }
  return TIER_CONFIG[tier].features[feature];
}

export function isWithinLimit(
  tier: SubscriptionTier,
  resource: "branches" | "users" | "menuItems" | "warehouses",
  currentCount: number,
  userRole?: Role | null
): boolean {
  // SUPER_ADMIN bypasses all tier restrictions
  if (isSuperAdmin(userRole)) {
    return true;
  }
  
  const limits = TIER_CONFIG[tier];
  switch (resource) {
    case "branches":
      return currentCount < limits.maxBranches;
    case "users":
      return currentCount < limits.maxUsers;
    case "menuItems":
      return limits.maxMenuItems === null || currentCount < limits.maxMenuItems;
    case "warehouses":
      return currentCount < limits.maxWarehouses;
    default:
      return false;
  }
}

export const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  FREE: "Free",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

export const TIER_DESCRIPTIONS: Record<SubscriptionTier, string> = {
  FREE: "Get started with essential POS and inventory for a single branch",
  PRO: "Full platform with AI, delivery, online ordering, and advanced reporting",
  ENTERPRISE: "Unlimited scale with WhatsApp ordering, custom branding, and dedicated support",
};
