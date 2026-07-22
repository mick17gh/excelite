import { Suspense } from "react";
import { BranchesContent } from "@/components/branches/branches-content";
import { getBranches, getBranchPerformance } from "@/lib/actions/branches";
import { pickBranchListItem } from "@/lib/branches/serialize-client";
import { getOrganization } from "@/lib/actions/organization";

export const metadata = {
  title: "Branch Performance",
  description: "Monitor and analyze performance across all restaurant branches",
};

export default async function BranchesPage() {
  const [branchesResult, performanceResult, orgResult] = await Promise.all([
    getBranches(),
    getBranchPerformance(),
    getOrganization(),
  ]);

  const branchList = (branchesResult.data ?? []).map(pickBranchListItem);
  const branchData = performanceResult.data || [];
  const org = orgResult.data;

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

      <Suspense fallback={<BranchesLoadingSkeleton />}>
        <BranchesContent branches={branchData} branchList={branchList} currentCount={org?.branchCount || 0} maxBranches={org?.maxBranches || 1} />
      </Suspense>
    </div>
  );
}

function BranchesLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
