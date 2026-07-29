import { Suspense } from "react";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { getSuppliersForManagement } from "@/lib/actions/inventory";
import { SuppliersContent } from "@/components/suppliers/suppliers-content";

export const metadata = {
  title: "Suppliers",
  description: "Manage supplier reliability, terms, and spend history",
};

export default function SuppliersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Suppliers</h1>
        <p className="text-muted-foreground">
          Manage supplier profiles, tags, and lifetime payments
        </p>
      </div>
      <Suspense fallback={<DashboardPageSkeleton kpiCount={0} />}>
        <SuppliersPageData />
      </Suspense>
    </div>
  );
}

async function SuppliersPageData() {
  const suppliersResult = await getSuppliersForManagement();
  const suppliers = suppliersResult.data || [];

  return <SuppliersContent suppliers={suppliers} />;
}
