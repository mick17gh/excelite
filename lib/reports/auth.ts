import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Role } from "@/lib/generated/prisma/client";

export interface ReportViewerContext {
  userId: string;
  role: Role;
  branchId: string | null;
}

export async function resolveReportViewer(): Promise<
  { ok: true; viewer: ReportViewerContext } | { ok: false; error: string }
> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { ok: false, error: "Not authenticated" };
  }

  const role = session.user.role as Role;
  if (!hasPermission(role, "reports:generate")) {
    return { ok: false, error: "You do not have permission to generate reports" };
  }

  return {
    ok: true,
    viewer: {
      userId: session.user.id,
      role,
      branchId: session.user.branchId ?? null,
    },
  };
}

export function assertBranchAccess(
  viewer: ReportViewerContext,
  branchId: string | undefined
): string | undefined {
  if (!branchId) return undefined;
  const allBranchRoles: Role[] = [
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.EXECUTIVE,
    Role.OPERATIONS_MANAGER,
    Role.AUDITOR,
    Role.CALL_CENTER,
  ];
  const canViewAll = allBranchRoles.includes(viewer.role);
  if (!canViewAll && viewer.branchId !== branchId) {
    throw new Error("You do not have access to this branch");
  }
  return branchId;
}
