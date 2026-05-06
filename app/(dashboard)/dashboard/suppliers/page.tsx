import { Suspense } from "react";
import { getSuppliersForManagement } from "@/lib/actions/inventory";
import { SuppliersContent } from "@/components/suppliers/suppliers-content";

export const metadata = {
  title: "Suppliers | ServStack",
  description: "Manage supplier reliability, terms, and spend history",
};

export default async function SuppliersPage() {
  const suppliersResult = await getSuppliersForManagement();
  const suppliers = suppliersResult.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Suppliers</h1>
        <p className="text-muted-foreground">
          Manage supplier profiles, tags, and lifetime payments
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
        <SuppliersContent suppliers={suppliers} />
      </Suspense>
    </div>
  );
}
