import { Suspense } from "react";
import { AlertsContent } from "@/components/alerts/alerts-content";
import { getAlerts } from "@/lib/actions/alerts";
import { getBranches } from "@/lib/actions/branches";

export const metadata = {
  title: "Alerts & Insights | ServStack",
  description: "Smart alerts and automated insights for your restaurant operations",
};

export default async function AlertsPage() {
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

      <Suspense fallback={<AlertsLoadingSkeleton />}>
        <AlertsContent alerts={alerts} branches={branchList} />
      </Suspense>
    </div>
  );
}

function AlertsLoadingSkeleton() {
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
