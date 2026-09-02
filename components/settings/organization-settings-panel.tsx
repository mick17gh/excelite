"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getOrganizationSettingsBundle } from "@/lib/actions/organization-settings-bundle";
import { OrganizationTab } from "./organization-tab";

function TabPanelSkeleton() {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

interface OrganizationSettingsPanelProps {
  organizationId: string;
}

export function OrganizationSettingsPanel({ organizationId }: OrganizationSettingsPanelProps) {
  const [initialData, setInitialData] = useState<
    Awaited<ReturnType<typeof getOrganizationSettingsBundle>>["data"]
  >(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void getOrganizationSettingsBundle(organizationId).then((result) => {
      if (cancelled) return;
      setInitialData(result.data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  if (loading) {
    return <TabPanelSkeleton />;
  }

  return (
    <OrganizationTab
      organizationId={organizationId}
      initialData={initialData?.organization}
    />
  );
}
