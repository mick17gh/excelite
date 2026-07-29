"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Role, SubscriptionTier } from "@/lib/generated/prisma/client";
import { usePermissions } from "@/contexts/permissions-context";
import { EXCELITE_BRAND } from "@/lib/excelite-config";
import {
  DASHBOARD_BOTTOM_NAVIGATION,
  DASHBOARD_NAVIGATION,
  filterNavItems,
  type RouteAccessContext,
} from "@/lib/permissions/routes";

interface SidebarProps {
  className?: string;
  orgTier?: SubscriptionTier;
  tableManagementEnabled?: boolean;
}

function NavLink({
  item,
  pathname,
  collapsed,
}: {
  item: (typeof DASHBOARD_NAVIGATION)[0];
  pathname: string;
  collapsed: boolean;
}) {
  const isActive =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

  return (
    <Link
      href={item.href}
      prefetch
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-smooth min-w-0 cursor-pointer",
        isActive
          ? "nav-active"
          : "text-sidebar-foreground/70 hover:bg-primary/5 hover:text-primary",
        collapsed && "justify-center px-2",
      )}
      title={collapsed ? item.name : undefined}
    >
      <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
      {!collapsed && <span className="truncate min-w-0">{item.name}</span>}
    </Link>
  );
}

export function Sidebar({
  className,
  orgTier = "FREE",
  tableManagementEnabled = false,
}: SidebarProps) {
  const { permissions, role } = usePermissions();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const accessCtx: RouteAccessContext = useMemo(
    () => ({
      permissions,
      orgTier,
      tableManagementEnabled,
      role,
    }),
    [permissions, orgTier, tableManagementEnabled, role],
  );

  const filteredNavigation = useMemo(
    () => filterNavItems(DASHBOARD_NAVIGATION, accessCtx),
    [accessCtx],
  );
  const filteredBottomNavigation = useMemo(
    () => filterNavItems(DASHBOARD_BOTTOM_NAVIGATION, accessCtx),
    [accessCtx],
  );

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

  const homeHref = filteredNavigation[0]?.href ?? "/dashboard";

  return (
    <div
      className={cn(
        "flex h-full flex-col sidebar-blue transition-all duration-300 relative overflow-hidden",
        collapsed ? "w-[70px]" : "w-[260px]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center relative z-10 py-0 border-b border-sidebar-border",
          collapsed ? "h-16 justify-center px-2" : "h-16 justify-between px-4",
        )}
      >
        {!collapsed ? (
          <Link href={homeHref} className="flex items-center gap-2 flex-1 min-w-0">
            <Image
              src={EXCELITE_BRAND.logo}
              alt={EXCELITE_BRAND.name}
              width={36}
              height={36}
              className="h-9 w-9 object-contain shrink-0"
            />
            <div className="min-w-0">
              <span className="text-base font-bold text-sidebar-foreground truncate block leading-tight">
                Excelite
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                POS
              </span>
            </div>
          </Link>
        ) : (
          <Link href={homeHref} className="mx-auto">
            <Image
              src={EXCELITE_BRAND.logo}
              alt={EXCELITE_BRAND.name}
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground shrink-0",
            collapsed && "absolute top-2 right-2",
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-4 overflow-y-auto">
        <nav className="space-y-1 min-w-0">
          {filteredNavigation.map((item) => (
            <NavLink key={item.name} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </nav>
      </ScrollArea>

      <div className="px-3 pb-4">
        <Separator className="mb-4 bg-sidebar-border" />
        <nav className="space-y-1">
          {filteredBottomNavigation.map((item) => (
            <NavLink key={item.name} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-smooth hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 cursor-pointer",
              collapsed && "justify-center px-2",
            )}
            title={collapsed ? "Sign Out" : undefined}
          >
            {isSigningOut ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5 shrink-0" />
            )}
            {!collapsed && <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>}
          </button>
        </nav>
      </div>
    </div>
  );
}
