"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  getOrganization,
  updateOrganizationTableManagement,
} from "@/lib/actions/organization";
import { hasFeature } from "@/lib/tier-config";
import type { SubscriptionTier } from "@/lib/generated/prisma/client";

interface DineInTablesTabProps {
  organizationId: string;
  tier: SubscriptionTier;
}

export function DineInTablesTab({ organizationId, tier }: DineInTablesTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const tierAllowed = hasFeature(tier, "tableManagement");

  useEffect(() => {
    (async () => {
      const res = await getOrganization(organizationId);
      if (res.data) {
        setEnabled(res.data.tableManagementEnabled ?? false);
      }
      setLoading(false);
    })();
  }, [organizationId]);

  const handleSave = async () => {
    if (enabled && !tierAllowed) {
      toast.error("Upgrade to Pro or Enterprise to enable table management");
      return;
    }
    setSaving(true);
    const res = await updateOrganizationTableManagement({
      organizationId,
      tableManagementEnabled: enabled,
    });
    setSaving(false);
    if (res.error) toast.error(res.error);
    else toast.success("Dine-in & table settings saved");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                Table management
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                When off, POS dine-in works without tables (counter service). When on,
                staff seat guests at tables before ordering.
              </CardDescription>
            </div>
            <Badge
              className={
                enabled && tierAllowed
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-700"
              }
            >
              {enabled && tierAllowed ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {!tierAllowed && (
            <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 rounded-md p-2">
              Table management requires a Pro or Enterprise subscription.
            </p>
          )}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="table-mgmt">Enable table management</Label>
            <Switch
              id="table-mgmt"
              checked={enabled}
              disabled={!tierAllowed}
              onCheckedChange={setEnabled}
            />
          </div>
          {enabled && tierAllowed && (
            <p className="text-xs text-muted-foreground">
              Set up sections and tables under{" "}
              <Link href="/dashboard/branches" className="text-primary underline">
                Branches
              </Link>{" "}
              → select a branch → Tables. Use the{" "}
              <Link href="/dashboard/tables" className="text-primary underline">
                Floor board
              </Link>{" "}
              during service.
            </p>
          )}
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
