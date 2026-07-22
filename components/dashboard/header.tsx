"use client";

import { Search, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  NotificationBell,
  type DashboardNotification,
} from "@/components/dashboard/notification-bell";
import { EXCELITE_BRAND } from "@/lib/excelite-config";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { usePermissionsOptional } from "@/contexts/permissions-context";

interface HeaderProps {
  onMenuClick?: () => void;
  initialNotifications?: DashboardNotification[];
  initialUnreadCount?: number;
}

export function Header({
  onMenuClick,
  initialNotifications,
  initialUnreadCount,
}: HeaderProps) {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const permissionsCtx = usePermissionsOptional();
  const canOpenSettings = permissionsCtx?.hasPermission("settings:view") ?? false;

  const formatRole = (role?: string | null) => {
    if (!role) return "Member";
    return role
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const user = {
    name: session?.user?.name,
    email: session?.user?.email,
    role: formatRole((session?.user as { role?: string } | undefined)?.role),
    image: session?.user?.image,
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await authClient.signOut();
      toast.success("Signed out successfully");
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/60 bg-background/90 px-4 backdrop-blur-xl md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      <Link href="/dashboard" className="flex items-center gap-2 md:hidden shrink-0">
        <Image
          src={EXCELITE_BRAND.logo}
          alt={EXCELITE_BRAND.name}
          width={28}
          height={28}
          className="h-7 w-7 object-contain"
        />
        <span className="text-sm font-bold text-foreground">
          Excelite <span className="text-primary">POS</span>
        </span>
      </Link>

      <div className="flex-1">
        <form className="hidden">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search branches, transactions, inventory..."
              className="w-full max-w-md pl-8 bg-muted/50"
            />
          </div>
        </form>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <NotificationBell
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 gap-2 rounded-full px-2"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.image || undefined} alt={user.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user.name
                    ? user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                    : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left md:flex">
                <span className="text-sm font-medium">
                  {user.name || "User"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user.role || "Member"}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/account" prefetch={false}>My account</Link>
            </DropdownMenuItem>
            {canOpenSettings && (
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">Settings</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
