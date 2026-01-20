import { Suspense } from "react";
import { KitchenContent } from "@/components/kitchen/kitchen-content";
import { getBranches } from "@/lib/actions/branches";
import { listKitchenStations, listKitchenTickets } from "@/lib/actions/kitchen";

export const metadata = {
  title: "Kitchen Display System | Dinelytix",
  description: "Kitchen station screens with ticket routing and timers.",
};

export default async function KitchenPage() {
  const [branchesResult, stationsResult, ticketsResult] = await Promise.all([
    getBranches(),
    listKitchenStations(),
    listKitchenTickets(),
  ]);

  const branches = branchesResult.data || [];
  const stations = stationsResult.data || [];
  const tickets = ticketsResult.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Kitchen (KDS)</h1>
        <p className="text-muted-foreground">
          Station screens for incoming orders, routing, and production flow.
        </p>
      </div>

      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
        <KitchenContent branches={branches} stations={stations} tickets={tickets} />
      </Suspense>
    </div>
  );
}

