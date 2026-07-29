import { Suspense } from "react";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { CustomersContent } from "@/components/customers/customers-content";
import { getCustomers, getCustomerStats } from "@/lib/actions/customers";

export const metadata = {
  title: "Customers",
  description: "Manage customer relationships and order history",
};

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Customers</h1>
        <p className="text-muted-foreground">
          Manage customer relationships and view order history
        </p>
      </div>

      <Suspense fallback={<DashboardPageSkeleton kpiCount={3} />}>
        <CustomersPageData />
      </Suspense>
    </div>
  );
}

async function CustomersPageData() {
  const [customersResult, statsResult] = await Promise.all([
    getCustomers({ pageSize: 500 }),
    getCustomerStats(),
  ]);

  const customers = customersResult.data || [];
  const stats = statsResult.data;

  return <CustomersContent customers={customers} stats={stats} />;
}
