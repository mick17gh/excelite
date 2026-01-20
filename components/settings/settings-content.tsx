"use client";

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
  Mail,
  Key,
  Save,
} from "lucide-react";

export function SettingsContent() {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="profile">
          <User className="mr-2 h-4 w-4" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <Bell className="mr-2 h-4 w-4" />
          Notifications
        </TabsTrigger>
        <TabsTrigger value="security">
          <Shield className="mr-2 h-4 w-4" />
          Security
        </TabsTrigger>
        <TabsTrigger value="appearance">
          <Palette className="mr-2 h-4 w-4" />
          Appearance
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <div className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and profile picture
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    AJ
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">
                    Change Photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG or GIF. Max size 2MB.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue="Alex Johnson" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="alex@dinelytix.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Badge className="bg-primary/10 text-primary">CEO</Badge>
                    <span className="text-sm text-muted-foreground">
                      Full system access
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Branch Assignment
              </CardTitle>
              <CardDescription>
                Your assigned branches and access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">All Branches</Badge>
                <span className="text-sm text-muted-foreground">
                  You have access to all branches as a CEO
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="notifications">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alert summaries via email
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Critical Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Immediate notifications for critical issues
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Daily Digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Daily summary of all branch activities
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Automated weekly performance reports
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Low Stock Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications when inventory is low
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Staff Shortage Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications for understaffed shifts
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>

            <div className="flex justify-end">
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security">
        <div className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" />
              </div>
              <div className="flex justify-end">
                <Button>Update Password</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable 2FA</Label>
                  <p className="text-sm text-muted-foreground">
                    Use an authenticator app for additional security
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Manage your active login sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">Chrome on MacOS</p>
                    <p className="text-xs text-muted-foreground">
                      New York, US • Current session
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">Safari on iPhone</p>
                    <p className="text-xs text-muted-foreground">
                      New York, US • Last active 2 hours ago
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Revoke
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="appearance">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance Settings
            </CardTitle>
            <CardDescription>
              Customize how Dinelytix looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes
                  </p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Reduce spacing for more information density
                  </p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Animations</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable smooth transitions and animations
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>

            <div className="flex justify-end">
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
