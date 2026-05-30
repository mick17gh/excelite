"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  getTableServiceSettings,
  updateOrganizationTableManagement,
} from "@/lib/actions/organization";
import { hasFeature } from "@/lib/tier-config";
import type { SubscriptionTier } from "@/lib/generated/prisma/client";

interface DineInTablesTabProps {
  organizationId: string;
  tier: SubscriptionTier;
}

type BranchRow = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  tableServiceEnabled: boolean;
  tableCount: number;
};

export function DineInTablesTab({ organizationId, tier }: DineInTablesTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(new Set());

  const tierAllowed = hasFeature(tier, "tableManagement");

  useEffect(() => {
    (async () => {
      const res = await getTableServiceSettings(organizationId);
      if (res.data) {
        setEnabled(res.data.tableManagementEnabled ?? false);
        setBranches(res.data.branches);
        setSelectedBranchIds(
          new Set(
            res.data.branches.filter((b) => b.tableServiceEnabled).map((b) => b.id)
          )
        );
      }
      setLoading(false);
    })();
  }, [organizationId]);

  const toggleBranch = (branchId: string, checked: boolean) => {
    setSelectedBranchIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(branchId);
      else next.delete(branchId);
      return next;
    });
  };

  const handleSave = async () => {
    if (enabled && !tierAllowed) {
      toast.error("Upgrade to Pro or Enterprise to enable table management");
      return;
    }
    setSaving(true);
    const res = await updateOrganizationTableManagement({
      organizationId,
      tableManagementEnabled: enabled,
      tableServiceBranchIds: enabled ? [...selectedBranchIds] : [],
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }

    if (enabled) {
      const missingTables = branches.filter(
        (b) => selectedBranchIds.has(b.id) && b.tableCount === 0
      );
      if (missingTables.length > 0) {
        toast.message("Table service saved", {
          description: `${missingTables.map((b) => b.name).join(", ")} ${missingTables.length === 1 ? "has" : "have"} no tables configured yet. Set them up under Branches → Tables.`,
        });
      } else {
        toast.success("Dine-in & table settings saved");
      }
    } else {
      toast.success("Dine-in & table settings saved");
    }
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
                Enable the module for your organization, then choose which branches use
                table service in POS. Branches not selected use counter-style dine-in.
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
            <div className="space-y-3 rounded-lg border p-3">
              <div>
                <Label className="text-sm">Branches using table service</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Only selected branches show the table panel in POS and require seating
                  before dine-in orders.
                </p>
              </div>
              {branches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No branches found.</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {branches.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center gap-3 rounded-md border px-3 py-2"
                    >
                      <Checkbox
                        id={`branch-table-${b.id}`}
                        checked={selectedBranchIds.has(b.id)}
                        onCheckedChange={(checked) =>
                          toggleBranch(b.id, checked === true)
                        }
                      />
                      <label
                        htmlFor={`branch-table-${b.id}`}
                        className="flex-1 text-sm cursor-pointer"
                      >
                        <span className="font-medium">{b.name}</span>
                        <span className="text-muted-foreground ml-1">({b.code})</span>
                        {!b.isActive && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            Inactive
                          </Badge>
                        )}
                        {b.tableCount === 0 && selectedBranchIds.has(b.id) && (
                          <span className="block text-xs text-amber-700 dark:text-amber-400">
                            No tables configured —{" "}
                            <Link
                              href={`/dashboard/branches/${b.id}/tables`}
                              className="underline"
                            >
                              set up
                            </Link>
                          </span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                Use the{" "}
                <Link href="/dashboard/tables" className="text-primary underline">
                  Floor board
                </Link>{" "}
                during service at table-service branches.
              </p>
            </div>
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
