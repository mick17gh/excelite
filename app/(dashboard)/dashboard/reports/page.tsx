import { Suspense } from "react";
import { ReportsContent } from "@/components/reports/reports-content";
import { getBranches } from "@/lib/actions/branches";

export const metadata = {
  title: "Reports | ServStack",
  description: "Generate and export comprehensive business reports",
};

export default async function ReportsPage() {
  const branchesResult = await getBranches();
  const branchList = (branchesResult.data || []).map((branch: any) => {
    const { taxRate, ...rest } = branch;
    return {
      ...rest,
      taxRate: taxRate ? Number(taxRate) : 0,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Reports
        </h1>
        <p className="text-muted-foreground">
          Generate executive summaries and export detailed reports
        </p>
      </div>

      <Suspense fallback={<ReportsLoadingSkeleton />}>
        <ReportsContent branches={branchList} />
      </Suspense>
    </div>
  );
}

function ReportsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
