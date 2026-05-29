"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getOrganization, updateOrganizationPosPolicies } from "@/lib/actions/organization";
import { roleDisplayNames } from "@/lib/permissions";
import type { Role } from "@/lib/generated/prisma/client";

const APPROVER_OPTIONS: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "EXECUTIVE",
  "OPERATIONS_MANAGER",
  "BRANCH_MANAGER",
  "STAFF",
];

interface PosPoliciesTabProps {
  organizationId: string;
}

export function PosPoliciesTab({ organizationId }: PosPoliciesTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>(["EXECUTIVE", "ADMIN", "SUPER_ADMIN"]);
  const [enforceRouting, setEnforceRouting] = useState(false);
  const [blockSalesWhenOutOfStock, setBlockSalesWhenOutOfStock] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await getOrganization(organizationId);
      if (res.data) {
        setRoles((res.data.complimentaryApproverRoles as Role[]) || []);
        setEnforceRouting(res.data.enforceCommissaryRouting ?? false);
        setBlockSalesWhenOutOfStock(res.data.blockSalesWhenOutOfStock ?? false);
      }
      setLoading(false);
    })();
  }, [organizationId]);

  const toggleRole = (role: Role) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleSave = async () => {
    if (roles.length === 0) {
      toast.error("Select at least one approver role");
      return;
    }
    setSaving(true);
    const res = await updateOrganizationPosPolicies({
      organizationId,
      complimentaryApproverRoles: roles,
      enforceCommissaryRouting: enforceRouting,
      blockSalesWhenOutOfStock,
    });
    setSaving(false);
    if (res.error) toast.error(res.error);
    else toast.success("POS policies saved");
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
          <CardTitle className="text-base">Complimentary meals</CardTitle>
          <CardDescription className="text-xs">
            Roles that may authorize free food/drink at POS. Orders are $0, excluded from
            revenue, but still deduct branch inventory.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {APPROVER_OPTIONS.map((role) => (
            <div key={role} className="flex items-center gap-2">
              <Checkbox
                id={`role-${role}`}
                checked={roles.includes(role)}
                onCheckedChange={() => toggleRole(role)}
              />
              <Label htmlFor={`role-${role}`} className="text-sm font-normal">
                {roleDisplayNames[role]}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Out-of-stock sales</CardTitle>
          <CardDescription className="text-xs">
            When enabled, menu items cannot be sold at a branch if any recipe ingredient is
            below required stock. POS, Orders, Transactions, and the online store hide or
            block those items. Branches can override this default.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex items-center justify-between">
          <Label className="text-sm">Block sales when out of stock</Label>
          <Switch
            checked={blockSalesWhenOutOfStock}
            onCheckedChange={setBlockSalesWhenOutOfStock}
          />
        </CardContent>
      </Card>

      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Commissary routing</CardTitle>
          <CardDescription className="text-xs">
            When enabled, SKUs marked as requiring commissary processing cannot be sent
            directly from RAW warehouse to branches.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex items-center justify-between">
          <Label className="text-sm">Enforce commissary routing</Label>
          <Switch checked={enforceRouting} onCheckedChange={setEnforceRouting} />
        </CardContent>
      </Card>

      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
        Save policies
      </Button>
    </div>
  );
}
