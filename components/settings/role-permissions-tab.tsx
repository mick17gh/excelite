"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, RotateCcw, Save, Shield, UserCog } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@/lib/generated/prisma/client";
import { LITE_ASSIGNABLE_ROLES, LITE_PERMISSION_GROUP_KEYS } from "@/lib/excelite-config";
import {
  EDITABLE_MATRIX_ROLES,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  PLATFORM_ONLY_PERMISSIONS,
  type Permission,
} from "@/lib/permissions/types";
import {
  ALL_REPORT_TYPE_PERMISSIONS,
  isReportTypePermissionString,
} from "@/lib/permissions/report-permissions";
import { roleDisplayNames } from "@/lib/permissions/labels";
import {
  getOrgRolePermissionMatrix,
  resetRolePermissionsToDefaults,
  updateOrgRolePermissions,
} from "@/lib/actions/role-permissions";

interface RolePermissionsTabProps {
  actorRole: Role;
}

export function RolePermissionsTab({ actorRole }: RolePermissionsTabProps) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role>("BRANCH_MANAGER");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [readOnly, setReadOnly] = useState(false);
  const [source, setSource] = useState<"database" | "defaults" | "code">("defaults");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadMatrix = useCallback(async (role: Role) => {
    setLoading(true);
    const res = await getOrgRolePermissionMatrix(role);
    setLoading(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setPermissions(res.data.permissions);
    setReadOnly(res.data.readOnly);
    setSource(res.data.source);
  }, []);

  useEffect(() => {
    loadMatrix(selectedRole);
  }, [selectedRole, loadMatrix]);

  const liteRoles = useMemo(
    () =>
      EDITABLE_MATRIX_ROLES.filter((role) =>
        (LITE_ASSIGNABLE_ROLES as readonly string[]).includes(role),
      ),
    [],
  );
  const litePermissionGroups = useMemo(
    () =>
      PERMISSION_GROUPS.filter((group) =>
        (LITE_PERMISSION_GROUP_KEYS as readonly string[]).includes(group.id),
      ),
    [],
  );
  const platformOnlySet = useMemo(() => new Set(PLATFORM_ONLY_PERMISSIONS), []);
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const isPermissionChecked = (permission: Permission) => {
    if (isReportTypePermissionString(permission)) {
      return (
        permissionSet.has(permission) || permissionSet.has("reports:generate")
      );
    }
    return permissionSet.has(permission);
  };

  const togglePermission = (permission: Permission, checked: boolean) => {
    if (readOnly) return;
    if (actorRole !== "SUPER_ADMIN" && platformOnlySet.has(permission)) {
      toast.error("Only Super Admin can assign this permission");
      return;
    }

    if (permission === "reports:generate") {
      setPermissions((prev) => {
        if (checked) {
          return [
            ...new Set<Permission>([
              ...prev,
              "reports:generate",
              ...ALL_REPORT_TYPE_PERMISSIONS,
            ]),
          ];
        }
        return prev.filter(
          (p) => p !== "reports:generate" && !isReportTypePermissionString(p),
        );
      });
      return;
    }

    if (isReportTypePermissionString(permission)) {
      setPermissions((prev) => {
        let next: Permission[] = checked
          ? [...new Set<Permission>([...prev, permission])]
          : prev.filter((p) => p !== permission);
        if (!checked) {
          next = next.filter((p) => p !== "reports:generate");
        }
        return next;
      });
      return;
    }

    setPermissions((prev) =>
      checked ? [...new Set([...prev, permission])] : prev.filter((p) => p !== permission),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await updateOrgRolePermissions({ role: selectedRole, permissions });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Role permissions saved");
    router.refresh();
    await loadMatrix(selectedRole);
  };

  const handleReset = async () => {
    if (!confirm(`Reset ${roleDisplayNames[selectedRole]} to default permissions?`)) return;
    setSaving(true);
    const res = await resetRolePermissionsToDefaults(selectedRole);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Role reset to defaults");
    router.refresh();
    await loadMatrix(selectedRole);
  };

  return (
    <div className="space-y-4">
      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles & Permissions
          </CardTitle>
          <CardDescription className="text-xs">
            Configure what each role can do in your organization. Changes apply on the next page
            load for affected users.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 min-w-[200px]">
              <Label className="text-xs">Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as Role)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {liteRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleDisplayNames[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="secondary" className="text-xs">
              {permissions.length} permissions
              {source !== "code" ? ` · ${source}` : ""}
            </Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/users">
                <UserCog className="mr-1.5 h-3.5 w-3.5" />
                Assign users to roles
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : readOnly ? (
            <p className="text-sm text-muted-foreground py-4">
              Super Admin always has full platform access and cannot be edited here.
            </p>
          ) : (
            <Accordion
              type="multiple"
              defaultValue={[litePermissionGroups[0]?.id].filter(Boolean)}
              className="max-h-[min(60vh,520px)] overflow-y-auto rounded-lg border px-3"
            >
              {litePermissionGroups.map((group) => {
                const visiblePermissions = group.permissions.filter(
                  (p) =>
                    !p.startsWith("kitchen:") &&
                    !p.startsWith("tables:") &&
                    !p.startsWith("api-keys:") &&
                    !p.startsWith("subscriptions:"),
                );
                const enabledCount = visiblePermissions.filter((p) =>
                  isPermissionChecked(p),
                ).length;
                return (
                  <AccordionItem key={group.id} value={group.id} className="border-b last:border-b-0">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <span className="flex flex-1 items-center justify-between gap-2 pr-2">
                        <span>
                          {group.id === "operations" ? "POS & Orders" : group.label}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-normal shrink-0">
                          {enabledCount}/{visiblePermissions.length}
                        </Badge>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {visiblePermissions.map((permission) => {
                          const platformLocked =
                            platformOnlySet.has(permission) && actorRole !== "SUPER_ADMIN";
                          return (
                            <div key={permission} className="flex items-start gap-2">
                              <Checkbox
                                id={`perm-${permission}`}
                                checked={isPermissionChecked(permission)}
                                disabled={platformLocked}
                                onCheckedChange={(c) =>
                                  togglePermission(permission, c === true)
                                }
                              />
                              <Label
                                htmlFor={`perm-${permission}`}
                                className="text-sm font-normal leading-snug cursor-pointer"
                              >
                                {PERMISSION_LABELS[permission]}
                                {platformLocked ? (
                                  <span className="block text-[10px] text-muted-foreground">
                                    Super Admin only
                                  </span>
                                ) : null}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}

          {!readOnly && !loading && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Save role
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                disabled={saving}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset to defaults
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
