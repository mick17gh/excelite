"use client";

import { authClient } from "@/lib/auth-client";

// Client-side role permissions (subset needed for branch restrictions)
const ROLE_CAN_VIEW_ALL_BRANCHES: Record<string, boolean> = {
  SUPER_ADMIN: true,
  EXECUTIVE: true,
  OPERATIONS_MANAGER: true,
  BRANCH_MANAGER: false,
  SUPERVISOR: false,
  STAFF: false,
  KITCHEN_STAFF: false,
  AUDITOR: true,
  DEVELOPER: false,
  CALL_CENTER: true,
  WAREHOUSE_STAFF: false,
};

export function useBranchRestrictions() {
  const { data: session } = authClient.useSession();
  
  // Cast user to access additional fields from better-auth
  const user = session?.user as { role?: string; branchId?: string } | undefined;
  
  const userRole = user?.role || "STAFF";
  const userBranchId = user?.branchId || null;
  
  const canViewAllBranches = ROLE_CAN_VIEW_ALL_BRANCHES[userRole] ?? false;
  
  return {
    canViewAllBranches,
    userBranchId,
    userRole,
    isLoading: !session,
  };
}

export function filterBranchesForUser<T extends { id: string }>(
  branches: T[],
  canViewAllBranches: boolean,
  userBranchId: string | null
): T[] {
  if (canViewAllBranches) {
    return branches;
  }
  
  if (!userBranchId) {
    return [];
  }
  
  return branches.filter(branch => branch.id === userBranchId);
}
