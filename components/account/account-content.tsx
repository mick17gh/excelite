"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings, User } from "lucide-react";
import { getCurrentUser } from "@/lib/actions/settings";
import { usePermissions } from "@/contexts/permissions-context";
import { ChangePasswordCard } from "@/components/account/change-password-card";
import { ChangePinCard } from "@/components/account/change-pin-card";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function AccountContent() {
  const { hasPermission } = usePermissions();
  const canOpenSettings = hasPermission("settings:view");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    role: string;
    image: string | null;
    branchName: string | null;
  } | null>(null);

  useEffect(() => {
    getCurrentUser().then((res) => {
      setLoading(false);
      if (res.success && res.data) {
        setUser({
          name: res.data.name,
          email: res.data.email,
          role: res.data.role,
          image: res.data.image,
          branchName: res.data.branchName,
        });
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg">
      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            My Account
          </CardTitle>
          <CardDescription className="text-xs">
            Your sign-in details. Contact an administrator to change your role or
            branch assignment.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user?.image || undefined} alt={user?.name} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user ? getInitials(user.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 min-w-0">
              <p className="font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {user?.role ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {formatRole(user.role)}
                  </Badge>
                ) : null}
                {user?.branchName ? (
                  <Badge variant="outline" className="text-[10px]">
                    {user.branchName}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          {canOpenSettings ? (
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-1.5 h-3.5 w-3.5" />
                Open full settings
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <ChangePasswordCard />
      <ChangePinCard />

      <p className="text-xs text-muted-foreground">
        Forgot your password? Use{" "}
        <Link href="/forgot-password" className="text-primary underline-offset-4 hover:underline">
          reset password
        </Link>{" "}
        on the sign-in page.
      </p>
    </div>
  );
}
