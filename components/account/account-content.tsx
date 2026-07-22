"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/dashboard/content-card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings, User } from "lucide-react";
import { getCurrentUser } from "@/lib/actions/settings";
import { usePermissions } from "@/contexts/permissions-context";
import { ChangePasswordCard } from "@/components/account/change-password-card";
import { ChangePinCard } from "@/components/account/change-pin-card";
import { dashboardPrimaryButtonClass, roleBadgeClass } from "@/components/dashboard/dashboard-theme";

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
    <div className="space-y-4 max-w-2xl">
      <ContentCard padding="none">
        <div className="px-4 py-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[#16A34A]" />
            <h3 className="text-base font-semibold text-[#222831]">My Account</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Your sign-in details. Contact an administrator to change your role or branch assignment.
          </p>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-4 rounded-xl bg-[#22C55E]/5 border border-[#22C55E]/15 p-4">
            <Avatar className="h-16 w-16 ring-2 ring-[#22C55E]/30">
              <AvatarImage src={user?.image || undefined} alt={user?.name} />
              <AvatarFallback className="bg-[#22C55E]/15 text-[#16A34A] text-lg font-semibold">
                {user ? getInitials(user.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5 min-w-0 flex-1">
              <p className="font-semibold text-[#222831] truncate">{user?.name}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {user?.role ? (
                  <Badge variant="outline" className={roleBadgeClass(user.role)}>
                    {formatRole(user.role)}
                  </Badge>
                ) : null}
                {user?.branchName ? (
                  <Badge
                    variant="outline"
                    className="border-[#22C55E]/25 bg-[#22C55E]/8 text-[#16A34A] text-[10px]"
                  >
                    {user.branchName}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          {canOpenSettings ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button className={dashboardPrimaryButtonClass} asChild>
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Open settings
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </ContentCard>

      <ChangePasswordCard />
      <ChangePinCard />

      <p className="text-xs text-muted-foreground">
        Forgot your password? Use{" "}
        <Link href="/forgot-password" className="text-[#16A34A] underline-offset-4 hover:underline">
          reset password
        </Link>{" "}
        on the sign-in page.
      </p>
    </div>
  );
}
