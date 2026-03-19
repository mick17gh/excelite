import { Suspense } from "react";
import { DeliveryContent } from "@/components/delivery/delivery-content";
import { getDeliveryRequests, getDeliveryStats } from "@/lib/actions/delivery";

export const metadata = {
  title: "Delivery | ServStack",
  description: "Track and manage delivery requests",
};

export default async function DeliveryPage() {
  const [deliveriesResult, statsResult] = await Promise.all([
    getDeliveryRequests({ pageSize: 200 }),
    getDeliveryStats(),
  ]);

  const deliveries = deliveriesResult.data || [];
  const stats = statsResult.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Delivery</h1>
        <p className="text-muted-foreground">
          Track and manage delivery requests and drivers
        </p>
      </div>

      <Suspense fallback={<DeliveryLoadingSkeleton />}>
        <DeliveryContent deliveries={deliveries} stats={stats} />
      </Suspense>
    </div>
  );
}

function DeliveryLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
