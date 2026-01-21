import { Suspense } from "react";
import { SettingsContent } from "@/components/settings/settings-content";

export const metadata = {
  title: "Settings | Dinelytix",
  description: "Configure your Dinelytix platform settings",
};

export default async function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Settings
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage your account and platform preferences
        </p>
      </div>

      <Suspense fallback={<SettingsLoadingSkeleton />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}

function SettingsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
