import { cn } from "@/lib/utils";

/** Shared pulse skeleton for route `loading.tsx` and Suspense fallbacks. */
export function DashboardPageSkeleton({
  kpiCount = 4,
  className,
}: {
  kpiCount?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6 p-1", className)}>
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-lg bg-muted" />
      </div>
      {kpiCount > 0 ? (
        <div
          className={cn(
            "grid gap-3 sm:gap-4",
            kpiCount >= 4
              ? "grid-cols-2 lg:grid-cols-4"
              : kpiCount === 3
                ? "sm:grid-cols-3"
                : "sm:grid-cols-2",
          )}
        >
          {Array.from({ length: kpiCount }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted border" />
          ))}
        </div>
      ) : null}
      <div className="h-96 animate-pulse rounded-2xl bg-muted border" />
    </div>
  );
}

export function PosPageSkeleton() {
  return (
    <div className="flex h-full min-h-[70vh] gap-3 p-2">
      <div className="flex-1 animate-pulse rounded-2xl bg-muted" />
      <div className="hidden w-[380px] animate-pulse rounded-2xl bg-muted lg:block" />
    </div>
  );
}
