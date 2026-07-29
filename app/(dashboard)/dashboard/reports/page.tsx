import { Suspense } from "react";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { ReportsContent } from "@/components/reports/reports-content";
import { getBranches } from "@/lib/actions/branches";
import { isTableManagementEnabled } from "@/lib/features/table-management";
import { db } from "@/lib/db";

export const metadata = {
  title: "Reports",
  description: "Generate and export comprehensive business reports",
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Reports
        </h1>
        <p className="text-muted-foreground">
          Sales, transactions, and orders reports for your business
        </p>
      </div>

      <Suspense fallback={<DashboardPageSkeleton kpiCount={0} />}>
        <ReportsPageData />
      </Suspense>
    </div>
  );
}

async function ReportsPageData() {
  const [branchesResult, org] = await Promise.all([
    getBranches(),
    db.organization.findFirst({ select: { id: true } }),
  ]);
  const tableManagementEnabled = org?.id
    ? await isTableManagementEnabled(org.id)
    : false;
  const branchList = (branchesResult.data || []).map((branch: any) => {
    const { taxRate, ...rest } = branch;
    return {
      ...rest,
      taxRate: taxRate ? Number(taxRate) : 0,
    };
  });

  return (
    <ReportsContent
      branches={branchList}
      tableManagementEnabled={tableManagementEnabled}
    />
  );
}
