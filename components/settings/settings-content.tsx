"use client";

import { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ContentCard } from "@/components/dashboard/content-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Bell,
  Shield,
  Palette,
  Building2,
  Key,
  Save,
  Loader2,
  Calculator,
  CreditCard,
  ChefHat,
  Briefcase,
} from "lucide-react";
import { OrganizationTab } from "./organization-tab";
import { SubscriptionTab } from "./subscription-tab";
import { KitchenStationsTab } from "./kitchen-stations-tab";
import { JobRolesTab } from "./job-roles-tab";
import { PlatformAdminTab } from "./platform-admin-tab";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import {
  getCurrentUser,
  updateProfile,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/actions/settings";
import {
  getBranchTaxRate,
  updateBranchTaxSettings,
} from "@/lib/actions/tax";
import { getBranches } from "@/lib/actions/branches";
import { getOrganization } from "@/lib/actions/organization";
import { OnlineStoreTab } from "./online-store-tab";
import { DataManagementTab } from "./data-management-tab";
import { RolePermissionsTab } from "./role-permissions-tab";
import { PosPoliciesTab } from "./pos-policies-tab";
import { DineInTablesTab } from "./dine-in-tables-tab";
import { ChangePasswordCard } from "@/components/account/change-password-card";
import { ChangePinCard } from "@/components/account/change-pin-card";
import { ActiveSessionsCard } from "@/components/settings/active-sessions-card";
import type { Role } from "@/lib/generated/prisma/client";
import { usePermissions } from "@/contexts/permissions-context";
import {
  dashboardPrimaryButtonClass,
  dashboardSectionCardClass,
  dashboardTabListClass,
  roleBadgeClass,
} from "@/components/dashboard/dashboard-theme";
import { cn } from "@/lib/utils";

interface UserData {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  image: string | null;
  branchId: string | null;
  branchName: string | null;
  organizationId?: string | null;
}

export function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const { hasPermission } = usePermissions();
  const canPurgeData = hasPermission("transactions:purge");
  const canManagePlatform = hasPermission("subscriptions:manage");
  const canViewOrganization = hasPermission("organization:view");
  const canViewSubscription = false; // Excelite lite — no subscription tiers
  const canEditStaff = false; // Excelite lite — no staff module

  // User data
  const [user, setUser] = useState<UserData | null>(null);
  const canManageTeamPermissions =
    hasPermission("users:edit") || user?.role === "SUPER_ADMIN";
  const [isLoading, setIsLoading] = useState(true);
  const [organizationTier, setOrganizationTier] = useState<"FREE" | "PRO" | "ENTERPRISE">("FREE");
  
  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
  });
  
  // Notification preferences
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    emailNotifications: true,
    criticalAlerts: true,
    dailyDigest: true,
    weeklyReports: true,
    lowStockAlerts: true,
    staffShortageAlerts: true,
  });

  // Tax configuration
  const [branches, setBranches] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [taxSettings, setTaxSettings] = useState({
    taxRate: 12.5,
    taxName: "VAT",
    taxEnabled: true,
    taxInclusive: false,
    showTaxOnReceipt: true,
    taxNumber: "",
    showTaxNumberOnReceipt: false,
  });

  // Load user data on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [userResult, branchesResult, orgResult] = await Promise.all([
          getCurrentUser(),
          getBranches(),
          getOrganization(),
        ]);
        
        if (userResult.success && userResult.data) {
          setUser(userResult.data);
          setProfileForm({
            name: userResult.data.name,
            email: userResult.data.email,
            phoneNumber: userResult.data.phoneNumber || "",
          });
        }
        
        if (branchesResult.success && branchesResult.data) {
          setBranches(branchesResult.data);
          if (branchesResult.data.length > 0) {
            setSelectedBranch(branchesResult.data[0].id);
          }
        }
        if (orgResult.data?.tier) {
          setOrganizationTier(orgResult.data.tier);
        }
      } catch (error) {
        console.error("Failed to load settings data:", error);
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Load tax settings when branch changes
  useEffect(() => {
    if (selectedBranch) {
      loadTaxSettings(selectedBranch);
    }
  }, [selectedBranch]);

  const loadTaxSettings = async (branchId: string) => {
    try {
      const settings = await getBranchTaxRate(branchId);
      setTaxSettings({
        taxRate: settings.rate,
        taxName: settings.name,
        taxEnabled: settings.enabled,
        taxInclusive: settings.inclusive,
        showTaxOnReceipt: settings.showTaxOnReceipt,
        taxNumber: settings.taxNumber ?? "",
        showTaxNumberOnReceipt: settings.showTaxNumberOnReceipt,
      });
    } catch (error) {
      console.error("Failed to load tax settings:", error);
    }
  };

  const handleSaveProfile = () => {
    startTransition(async () => {
      const result = await updateProfile({
        name: profileForm.name,
        email: profileForm.email,
        phoneNumber: profileForm.phoneNumber || undefined,
      });
      
      if (result.success) {
        toast.success("Profile updated successfully");
        // Update local state
        if (user) {
          setUser({ ...user, ...profileForm });
        }
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    });
  };

  const handleSaveNotifications = () => {
    startTransition(async () => {
      const result = await updateNotificationPreferences(notifications);
      
      if (result.success) {
        toast.success("Notification preferences saved");
      } else {
        toast.error(result.error || "Failed to save preferences");
      }
    });
  };

  const handleSaveTaxSettings = () => {
    if (!selectedBranch) {
      toast.error("Please select a branch");
      return;
    }

    startTransition(async () => {
      const result = await updateBranchTaxSettings(selectedBranch, taxSettings);
      
      if (result.success) {
        toast.success("Tax settings updated successfully");
      } else {
        toast.error(result.error || "Failed to update tax settings");
      }
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => roleBadgeClass(role);

  const formatRole = (role: string) => {
    return role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue={initialTab} className="w-full">
      <TabsList className={cn(dashboardTabListClass, "mb-6 h-11 flex-wrap w-full sm:w-auto inline-flex")}>
        <TabsTrigger value="profile" className="rounded-lg px-3 text-sm data-[state=active]:bg-[#22C55E] data-[state=active]:text-white">
          <User className="mr-1.5 h-4 w-4" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="security" className="rounded-lg px-3 text-sm data-[state=active]:bg-[#22C55E] data-[state=active]:text-white">
          <Shield className="mr-1.5 h-4 w-4" />
          Security
        </TabsTrigger>
        <TabsTrigger value="tax" className="rounded-lg px-3 text-sm data-[state=active]:bg-[#22C55E] data-[state=active]:text-white">
          <Calculator className="mr-1.5 h-4 w-4" />
          Tax
        </TabsTrigger>
        {canViewOrganization && (
          <TabsTrigger value="organization" className="rounded-lg px-3 text-sm data-[state=active]:bg-[#22C55E] data-[state=active]:text-white">
            <Building2 className="mr-1.5 h-4 w-4" />
            Business
          </TabsTrigger>
        )}
        {canManageTeamPermissions && (
          <TabsTrigger value="role-permissions" className="rounded-lg px-3 text-sm data-[state=active]:bg-[#22C55E] data-[state=active]:text-white">
            <Key className="mr-1.5 h-4 w-4" />
            Team Permissions
          </TabsTrigger>
        )}
        {canManagePlatform && (
          <TabsTrigger value="platform-admin" className="rounded-lg px-3 text-sm data-[state=active]:bg-[#22C55E] data-[state=active]:text-white">
            <Shield className="mr-1.5 h-4 w-4" />
            Platform Admin
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="profile">
        <div className="space-y-4">
          <ContentCard padding="none">
            <div className="px-4 py-3 border-b border-border/60 bg-muted/20">
              <h3 className="text-base font-semibold text-[#222831]">Profile Information</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Update your personal information</p>
            </div>
            <CardContent className="px-4 pb-4 pt-4 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-[#22C55E]/25">
                  <AvatarImage src={user?.image || ""} />
                  <AvatarFallback className="bg-[#22C55E]/10 text-[#16A34A] text-lg">
                    {user ? getInitials(user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">Full Name</Label>
                  <Input
                    id="name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileForm.phoneNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Role</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Badge variant="outline" className={getRoleBadgeColor(user?.role || "")}>
                      {formatRole(user?.role || "")}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button className={dashboardPrimaryButtonClass} onClick={handleSaveProfile} disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </ContentCard>

          <ContentCard padding="none">
            <div className="px-4 py-3 border-b border-border/60 bg-muted/20 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#16A34A]" />
              <h3 className="text-base font-semibold text-[#222831]">Branch Assignment</h3>
            </div>
            <CardContent className="px-4 pb-4 pt-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {user?.branchName || "All Branches"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {user?.role === "SUPER_ADMIN" || user?.role === "EXECUTIVE" || user?.role === "OPERATIONS_MANAGER" || user?.role === "AUDITOR"
                    ? "You have access to all branches"
                    : `Assigned to ${user?.branchName}`}
                </span>
              </div>
            </CardContent>
          </ContentCard>
        </div>
      </TabsContent>

      <TabsContent value="notifications">
        <Card className="chart-card rounded-xl">
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Notification Preferences
            </CardTitle>
            <CardDescription className="text-xs">
              Choose how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            {[
              { key: "emailNotifications", label: "Email Notifications", desc: "Receive alert summaries via email" },
              { key: "criticalAlerts", label: "Critical Alerts", desc: "Immediate notifications for critical issues" },
              { key: "dailyDigest", label: "Daily Digest", desc: "Daily summary of all branch activities" },
              { key: "weeklyReports", label: "Weekly Reports", desc: "Automated weekly performance reports" },
              { key: "lowStockAlerts", label: "Low Stock Alerts", desc: "Notifications when inventory is low" },
              { key: "staffShortageAlerts", label: "Staff Shortage Alerts", desc: "Notifications for understaffed shifts" },
            ].map((item, index) => (
              <div key={item.key}>
                {index > 0 && <Separator className="my-3" />}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">{item.label}</Label>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key as keyof NotificationPreferences]}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, [item.key]: checked })
                    }
                  />
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <Button className={dashboardPrimaryButtonClass} onClick={handleSaveNotifications} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security">
        <div className="space-y-4">
          <ChangePasswordCard />
          <ChangePinCard />
          <ActiveSessionsCard />
        </div>
      </TabsContent>

      <TabsContent value="appearance">
        <Card className="chart-card rounded-xl">
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4" />
              Appearance Settings
            </CardTitle>
            <CardDescription className="text-xs">
              Customize how Excelite POS looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Toggle between light and dark themes
                </p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">System Theme</Label>
                <p className="text-xs text-muted-foreground">
                  Follow your system&apos;s theme preference
                </p>
              </div>
              <Switch
                checked={theme === "system"}
                onCheckedChange={(checked) => setTheme(checked ? "system" : "light")}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tax">
        <ContentCard>
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4" />
              Tax Configuration
            </CardTitle>
            <CardDescription className="text-xs">
              Configure tax settings for each branch
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="branch-select" className="text-xs">Select Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tax-name" className="text-xs">Tax Name</Label>
                <Input
                  id="tax-name"
                  value={taxSettings.taxName}
                  onChange={(e) => setTaxSettings({ ...taxSettings, taxName: e.target.value })}
                  placeholder="e.g., VAT, GST, Sales Tax"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax-rate" className="text-xs">Tax Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxSettings.taxRate}
                  onChange={(e) => setTaxSettings({ ...taxSettings, taxRate: parseFloat(e.target.value) || 0 })}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tax pricing</Label>
              <Select
                value={taxSettings.taxInclusive ? "inclusive" : "exclusive"}
                onValueChange={(v) =>
                  setTaxSettings({ ...taxSettings, taxInclusive: v === "inclusive" })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive">
                    Exclusive — tax added at checkout
                  </SelectItem>
                  <SelectItem value="inclusive">
                    Inclusive — tax included in menu prices
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Menu prices are always what the customer sees. Exclusive adds tax on top;
                inclusive embeds tax in that price.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Enable Tax</Label>
                <p className="text-xs text-muted-foreground">
                  Apply tax to all transactions in this branch
                </p>
              </div>
              <Switch
                checked={taxSettings.taxEnabled}
                onCheckedChange={(checked) => setTaxSettings({ ...taxSettings, taxEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Show tax on receipt</Label>
                <p className="text-xs text-muted-foreground">
                  When off, receipts show menu prices only (no subtotal or tax lines). Recommended for
                  inclusive pricing when you do not want customers to see the tax split.
                </p>
              </div>
              <Switch
                checked={taxSettings.showTaxOnReceipt}
                onCheckedChange={(checked) =>
                  setTaxSettings({ ...taxSettings, showTaxOnReceipt: checked })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tax-number" className="text-xs">Tax number (TIN / VAT ID)</Label>
              <Input
                id="tax-number"
                value={taxSettings.taxNumber}
                onChange={(e) => {
                  const next = e.target.value;
                  setTaxSettings({
                    ...taxSettings,
                    taxNumber: next,
                    showTaxNumberOnReceipt: next.trim()
                      ? taxSettings.showTaxNumberOnReceipt
                      : false,
                  });
                }}
                placeholder="e.g. C0001234567"
                className="h-10 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Optional. Shown on receipts only when the toggle below is on.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Show tax number on receipt</Label>
                <p className="text-xs text-muted-foreground">
                  Print TIN / VAT ID under the branch name on on-screen and printed receipts. Off by default.
                </p>
              </div>
              <Switch
                checked={taxSettings.showTaxNumberOnReceipt}
                disabled={!taxSettings.taxNumber.trim()}
                onCheckedChange={(checked) =>
                  setTaxSettings({ ...taxSettings, showTaxNumberOnReceipt: checked })
                }
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium">Preview (GHS 100 menu item)</p>
              {taxSettings.taxEnabled ? (
                taxSettings.taxInclusive ? (
                  <p className="text-xs text-muted-foreground">
                    Customer pays <strong>GHS 100.00</strong> — net{" "}
                    {(100 / (1 + taxSettings.taxRate / 100)).toFixed(2)}, {taxSettings.taxName}{" "}
                    {(100 - 100 / (1 + taxSettings.taxRate / 100)).toFixed(2)} (included)
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Customer pays <strong>GHS {(100 * (1 + taxSettings.taxRate / 100)).toFixed(2)}</strong>{" "}
                    — subtotal GHS 100.00 + {taxSettings.taxName} GHS{" "}
                    {(100 * (taxSettings.taxRate / 100)).toFixed(2)}
                  </p>
                )
              ) : (
                <p className="text-xs text-muted-foreground">Tax is disabled for this branch</p>
              )}
            </div>

            <div className="flex justify-end">
                <Button className={dashboardPrimaryButtonClass} onClick={handleSaveTaxSettings} disabled={isPending || !selectedBranch}>
                {isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Save Tax Settings
              </Button>
            </div>
          </CardContent>
        </ContentCard>
      </TabsContent>

      {canViewOrganization && (
        <TabsContent value="organization">
          <OrganizationTab organizationId={user?.organizationId ?? undefined} />
        </TabsContent>
      )}

      <TabsContent value="dine-in-tables">
        {user?.organizationId ? (
          <DineInTablesTab organizationId={user.organizationId} tier={organizationTier} />
        ) : (
          <Card className="chart-card rounded-xl">
            <CardContent className="px-4 py-6 text-sm text-muted-foreground">
              Organization context is required.
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="kitchen">
        <KitchenStationsTab />
      </TabsContent>

      {canEditStaff && (
        <TabsContent value="job-roles">
          <JobRolesTab />
        </TabsContent>
      )}

      {canViewSubscription && (
        <TabsContent value="subscription">
          <SubscriptionTab />
        </TabsContent>
      )}

      <TabsContent value="online-store">
        {user?.organizationId ? (
          <OnlineStoreTab organizationId={user.organizationId} tier={organizationTier} />
        ) : (
          <Card className="chart-card rounded-xl">
            <CardContent className="px-4 py-6 text-sm text-muted-foreground">
              Organization context is required to manage online store settings.
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {canManageTeamPermissions && user && (
        <TabsContent value="role-permissions">
          <RolePermissionsTab actorRole={user.role as Role} />
        </TabsContent>
      )}

      {canPurgeData && (
        <TabsContent value="data-management">
          <DataManagementTab />
        </TabsContent>
      )}

      {canManagePlatform && (
        <TabsContent value="platform-admin">
          <PlatformAdminTab />
        </TabsContent>
      )}
    </Tabs>
  );
}
