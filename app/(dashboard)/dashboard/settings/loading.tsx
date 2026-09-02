export default function SettingsLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border bg-muted" />
    </div>
  );
}
