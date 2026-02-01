import { Suspense } from "react";
import { BranchesContent } from "@/components/branches/branches-content";
import { getBranches, getBranchPerformance } from "@/lib/actions/branches";

export const metadata = {
  title: "Branch Performance | Dinelytix",
  description: "Monitor and analyze performance across all restaurant branches",
};

export default async function BranchesPage() {
  const [branchesResult, performanceResult] = await Promise.all([
    getBranches(),
    getBranchPerformance(),
  ]);

  const branchList = (branchesResult.data || []).map((branch: any) => {
    const { taxRate, ...rest } = branch;
    return {
      ...rest,
      taxRate: taxRate ? Number(taxRate) : 0,
    };
  });
  const branchData = performanceResult.data || [];

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
        <BranchesContent branches={branchData} branchList={branchList} />
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
