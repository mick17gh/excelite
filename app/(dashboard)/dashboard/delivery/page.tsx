import { Suspense } from "react";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { DeliveryContent } from "@/components/delivery/delivery-content";
import { getDeliveryRequests, getDeliveryStats } from "@/lib/actions/delivery";

export const metadata = {
  title: "Delivery",
  description: "Track and manage delivery requests",
};

export default function DeliveryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Delivery</h1>
        <p className="text-muted-foreground">
          Track and manage delivery requests and drivers
        </p>
      </div>

      <Suspense fallback={<DashboardPageSkeleton kpiCount={4} />}>
        <DeliveryPageData />
      </Suspense>
    </div>
  );
}

async function DeliveryPageData() {
  const [deliveriesResult, statsResult] = await Promise.all([
    getDeliveryRequests({ pageSize: 200 }),
    getDeliveryStats(),
  ]);

  const deliveries = deliveriesResult.data || [];
  const stats = statsResult.data;

  return <DeliveryContent deliveries={deliveries} stats={stats} />;
}
