import { Suspense } from "react";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { AlertsContent } from "@/components/alerts/alerts-content";
import { getAlerts } from "@/lib/actions/alerts";
import { getBranches } from "@/lib/actions/branches";

export const metadata = {
  title: "Alerts & Insights",
  description: "Smart alerts and automated insights for your restaurant operations",
};

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Alerts & Smart Insights
        </h1>
        <p className="text-muted-foreground">
          Automated alerts and intelligent insights for proactive management
        </p>
      </div>

      <Suspense fallback={<DashboardPageSkeleton kpiCount={4} />}>
        <AlertsPageData />
      </Suspense>
    </div>
  );
}

async function AlertsPageData() {
  const [alertsResult, branchesResult] = await Promise.all([
    getAlerts(),
    getBranches(),
  ]);

  const alerts = alertsResult.data || [];
  const branchList = (branchesResult.data || []).map((branch: any) => {
    const { taxRate, ...rest } = branch;
    return {
      ...rest,
      taxRate: taxRate ? Number(taxRate) : 0,
    };
  });

  return <AlertsContent alerts={alerts} branches={branchList} />;
}
