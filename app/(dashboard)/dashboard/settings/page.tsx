import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsContent } from "@/components/settings/settings-content";

export const metadata = {
  title: "Settings",
  description: "Configure your Excelite POS platform settings",
};

export default async function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Manage your account and platform preferences"
      />

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
