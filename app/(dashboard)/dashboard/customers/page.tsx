import { Suspense } from "react";
import { CustomersContent } from "@/components/customers/customers-content";
import { getCustomers, getCustomerStats } from "@/lib/actions/customers";

export const metadata = {
  title: "Customers",
  description: "Manage customer relationships and order history",
};

export default async function CustomersPage() {
  const [customersResult, statsResult] = await Promise.all([
    getCustomers({ pageSize: 500 }),
    getCustomerStats(),
  ]);

  const customers = customersResult.data || [];
  const stats = statsResult.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Customers</h1>
        <p className="text-muted-foreground">
          Manage customer relationships and view order history
        </p>
      </div>

      <Suspense fallback={<CustomersLoadingSkeleton />}>
        <CustomersContent customers={customers} stats={stats} />
      </Suspense>
    </div>
  );
}

function CustomersLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
