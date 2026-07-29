import { Suspense } from "react";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { TargetsContent } from "@/components/targets/targets-content";
import { getTargets } from "@/lib/actions/targets";
import { getBranches } from "@/lib/actions/branches";

export const metadata = {
  title: "Branch Targets & KPIs",
  description: "Set and manage performance targets for branches",
};

export default function TargetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Branch Targets & KPIs
        </h1>
        <p className="text-muted-foreground">
          Set performance targets and KPIs for branches to track and compare performance
        </p>
      </div>

      <Suspense fallback={<DashboardPageSkeleton kpiCount={0} />}>
        <TargetsPageData />
      </Suspense>
    </div>
  );
}

async function TargetsPageData() {
  const [targetsResult, branchesResult] = await Promise.all([
    getTargets(),
    getBranches(),
  ]);

  const targets = targetsResult.data || [];
  const branches = (branchesResult.data || []).map((branch: any) => {
    const { taxRate, ...rest } = branch;
    return {
      ...rest,
      taxRate: taxRate ? Number(taxRate) : 0,
    };
  });

  return <TargetsContent targets={targets} branches={branches} />;
}
