import { Suspense } from "react";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { getBranches } from "@/lib/actions/branches";
import { FloorBoardContent } from "@/components/tables/floor-board-content";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { hasPermissionInList } from "@/lib/permissions/resolver";
import { requireSessionAccess } from "@/lib/permissions/load-session-access";

export const metadata = {
  title: "Floor Board",
  description: "Live table status and covers on the floor",
};

export default function FloorBoardPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton kpiCount={0} />}>
      <FloorBoardPageData />
    </Suspense>
  );
}

async function FloorBoardPageData() {
  const access = await requireSessionAccess();
  if (!hasPermissionInList(access.permissions, "tables:view")) {
    redirect("/dashboard");
  }
  if (!access.accessCtx.tableManagementEnabled) {
    redirect("/dashboard/settings");
  }

  const [session, branchesResult] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getBranches(),
  ]);

  const branches = (branchesResult.data || []).map((b) => ({
    id: b.id,
    name: b.name,
  }));

  return (
    <FloorBoardContent
      branches={branches}
      defaultBranchId={session?.user?.branchId ?? undefined}
      userRole={access.role}
    />
  );
}
