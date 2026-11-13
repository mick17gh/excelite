import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsContent } from "@/components/settings/settings-content";
import { getSettingsBootstrap } from "@/lib/actions/settings";

export const metadata = {
  title: "Settings",
  description: "Configure your ServGo platform settings",
};

export default async function SettingsPage() {
  const bootstrap = await getSettingsBootstrap();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Manage your account and platform preferences"
      />

      <Suspense fallback={<SettingsTabSkeleton />}>
        <SettingsContent
          initialUser={bootstrap.user}
          initialBranches={bootstrap.branches}
          initialOrganizationTier={bootstrap.organizationTier}
          initialStorefrontPlatformEnabled={bootstrap.storefrontPlatformEnabled}
        />
      </Suspense>
    </div>
  );
}

function SettingsTabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border bg-muted" />
    </div>
  );
}
