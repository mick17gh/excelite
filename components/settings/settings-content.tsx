"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
} from "lucide-react";
import { OrganizationTab } from "./organization-tab";
import { SubscriptionTab } from "./subscription-tab";
import { KitchenStationsTab } from "./kitchen-stations-tab";
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
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const { hasPermission } = usePermissions();
  const canViewRoles = hasPermission("roles:view");
  const canPurgeData = hasPermission("transactions:purge");
  const canManagePlatform = hasPermission("subscriptions:manage");
  const canViewOrganization = hasPermission("organization:view");
  const canViewSubscription = hasPermission("subscriptions:view");
  
  // User data
  const [user, setUser] = useState<UserData | null>(null);
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "EXECUTIVE":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "OPERATIONS_MANAGER":
        return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
      case "BRANCH_MANAGER":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "AUDITOR":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "DEVELOPER":
        return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
    }
  };

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
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="mb-6 h-9">
        <TabsTrigger value="profile" className="text-xs">
          <User className="mr-1.5 h-3.5 w-3.5" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="notifications" className="text-xs">
          <Bell className="mr-1.5 h-3.5 w-3.5" />
          Notifications
        </TabsTrigger>
        <TabsTrigger value="security" className="text-xs">
          <Shield className="mr-1.5 h-3.5 w-3.5" />
          Security
        </TabsTrigger>
        <TabsTrigger value="appearance" className="text-xs">
          <Palette className="mr-1.5 h-3.5 w-3.5" />
          Appearance
        </TabsTrigger>
        <TabsTrigger value="tax" className="text-xs">
          <Calculator className="mr-1.5 h-3.5 w-3.5" />
          Tax Config
        </TabsTrigger>
        {canViewOrganization && (
          <TabsTrigger value="organization" className="text-xs">
            <Building2 className="mr-1.5 h-3.5 w-3.5" />
            Organization
          </TabsTrigger>
        )}
        <TabsTrigger value="kitchen" className="text-xs">
          <ChefHat className="mr-1.5 h-3.5 w-3.5" />
          Kitchen
        </TabsTrigger>
        {canViewSubscription && (
          <TabsTrigger value="subscription" className="text-xs">
            <CreditCard className="mr-1.5 h-3.5 w-3.5" />
            Subscription
          </TabsTrigger>
        )}
        <TabsTrigger value="online-store" className="text-xs">
          <Building2 className="mr-1.5 h-3.5 w-3.5" />
          Online Store
        </TabsTrigger>
        <TabsTrigger value="dine-in-tables" className="text-xs">
          <ChefHat className="mr-1.5 h-3.5 w-3.5" />
          Dine-in
        </TabsTrigger>
        {canViewRoles && (
          <TabsTrigger value="role-permissions" className="text-xs">
            <Key className="mr-1.5 h-3.5 w-3.5" />
            Permissions
          </TabsTrigger>
        )}
        {canPurgeData && (
          <TabsTrigger value="data-management" className="text-xs">
            <Shield className="mr-1.5 h-3.5 w-3.5" />
            Data
          </TabsTrigger>
        )}
        {canManagePlatform && (
          <TabsTrigger value="platform-admin" className="text-xs">
            <Shield className="mr-1.5 h-3.5 w-3.5" />
            Platform Admin
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="profile">
        <div className="space-y-4">
          <Card className="chart-card rounded-xl">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base">Profile Information</CardTitle>
              <CardDescription className="text-xs">
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.image || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
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
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileForm.phoneNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Role</Label>
                  <div className="flex items-center gap-2 h-9">
                    <Badge className={getRoleBadgeColor(user?.role || "")}>
                      {formatRole(user?.role || "")}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveProfile} disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="chart-card rounded-xl">
            <CardHeader className="py-3 px-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Branch Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
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
          </Card>
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
              <Button size="sm" onClick={handleSaveNotifications} disabled={isPending}>
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
              Customize how ServStack looks on your device
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
        <Card className="chart-card rounded-xl">
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
              <Button size="sm" onClick={handleSaveTaxSettings} disabled={isPending || !selectedBranch}>
                {isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Save Tax Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {canViewOrganization && (
        <TabsContent value="organization">
          <div className="space-y-4">
            <OrganizationTab organizationId={user?.organizationId ?? undefined} />
            {user?.organizationId ? (
              <PosPoliciesTab organizationId={user.organizationId} />
            ) : null}
          </div>
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

      {canViewRoles && user && (
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
