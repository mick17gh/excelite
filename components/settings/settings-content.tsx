"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import {
  getCurrentUser,
  updateProfile,
  changePassword,
  getActiveSessions,
  revokeSession,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/actions/settings";

interface UserData {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  image: string | null;
  branchId: string | null;
  branchName: string | null;
}

interface Session {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: Date;
  isCurrent: boolean;
}

export function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  
  // User data
  const [user, setUser] = useState<UserData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
  });
  
  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
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

  // Load user data on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [userResult, sessionsResult] = await Promise.all([
          getCurrentUser(),
          getActiveSessions(),
        ]);
        
        if (userResult.success && userResult.data) {
          setUser(userResult.data);
          setProfileForm({
            name: userResult.data.name,
            email: userResult.data.email,
            phoneNumber: userResult.data.phoneNumber || "",
          });
        }
        
        if (sessionsResult.success && sessionsResult.data) {
          setSessions(sessionsResult.data);
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

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    
    startTransition(async () => {
      const result = await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      
      if (result.success) {
        toast.success("Password changed successfully");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        toast.error(result.error || "Failed to change password");
      }
    });
  };

  const handleRevokeSession = (sessionId: string) => {
    startTransition(async () => {
      const result = await revokeSession(sessionId);
      
      if (result.success) {
        toast.success("Session revoked");
        setSessions(sessions.filter((s) => s.id !== sessionId));
      } else {
        toast.error(result.error || "Failed to revoke session");
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
      case "CEO":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "SENIOR_MANAGEMENT":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "BRANCH_MANAGER":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
    }
  };

  const formatRole = (role: string) => {
    return role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const parseUserAgent = (ua: string) => {
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Edge")) return "Edge";
    return "Unknown Browser";
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
                  {user?.role === "CEO" || user?.role === "SENIOR_MANAGEMENT"
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
          <Card className="chart-card rounded-xl">
            <CardHeader className="py-3 px-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="h-4 w-4" />
                Change Password
              </CardTitle>
              <CardDescription className="text-xs">
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="current-password" className="text-xs">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-xs">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-xs">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleChangePassword}
                  disabled={isPending || !passwordForm.currentPassword || !passwordForm.newPassword}
                >
                  {isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="chart-card rounded-xl">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base">Active Sessions</CardTitle>
              <CardDescription className="text-xs">
                Manage your active login sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="space-y-2">
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active sessions found</p>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-2 rounded-lg border text-sm"
                    >
                      <div>
                        <p className="font-medium text-xs">{parseUserAgent(session.userAgent)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {session.ipAddress} • {session.isCurrent ? "Current session" : `Active`}
                        </p>
                      </div>
                      {session.isCurrent ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px] h-5">
                          Current
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={isPending}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
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
              Customize how Dinelytix looks on your device
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
                  Follow your system's theme preference
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
    </Tabs>
  );
}
