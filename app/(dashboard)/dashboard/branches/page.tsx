import { Suspense } from "react";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { BranchesContent } from "@/components/branches/branches-content";
import { getBranches, getBranchPerformance } from "@/lib/actions/branches";
import { pickBranchListItem } from "@/lib/branches/serialize-client";
import { getOrganization } from "@/lib/actions/organization";

export const metadata = {
  title: "Branch Performance",
  description: "Monitor and analyze performance across all restaurant branches",
};

export default function BranchesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Branch Performance
        </h1>
        <p className="text-muted-foreground">
          Monitor and analyze performance across all restaurant branches
        </p>
      </div>

      <Suspense fallback={<DashboardPageSkeleton kpiCount={4} />}>
        <BranchesPageData />
      </Suspense>
    </div>
  );
}

async function BranchesPageData() {
  const [branchesResult, performanceResult, orgResult] = await Promise.all([
    getBranches(),
    getBranchPerformance(),
    getOrganization(),
  ]);

  const branchList = (branchesResult.data ?? []).map(pickBranchListItem);
  const branchData = performanceResult.data || [];
  const org = orgResult.data;

  return (
    <BranchesContent
      branches={branchData}
      branchList={branchList}
      currentCount={org?.branchCount || 0}
      maxBranches={org?.maxBranches || 1}
    />
  );
}
