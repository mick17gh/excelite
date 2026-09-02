"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getOrganizationPosPoliciesBundle } from "@/lib/actions/organization-pos-policies-bundle";
import { PosPoliciesTab } from "./pos-policies-tab";

function TabPanelSkeleton() {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

interface PosPoliciesSettingsPanelProps {
  organizationId: string;
}

export function PosPoliciesSettingsPanel({ organizationId }: PosPoliciesSettingsPanelProps) {
  const [initialData, setInitialData] = useState<
    Awaited<ReturnType<typeof getOrganizationPosPoliciesBundle>>["data"]
  >(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void getOrganizationPosPoliciesBundle(organizationId).then((result) => {
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
    <PosPoliciesTab organizationId={organizationId} initialData={initialData ?? undefined} />
  );
}
