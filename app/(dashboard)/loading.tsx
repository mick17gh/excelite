import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-6">
      <DashboardPageSkeleton />
    </div>
  );
}
