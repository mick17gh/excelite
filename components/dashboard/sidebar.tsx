"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Package,
  TrendingUp,
  Users,
  Bell,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Receipt,
  UserCog,
  Loader2,
  UtensilsCrossed,
  Key,
  Tag,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Role } from "@/lib/generated/prisma/client";
import { hasPermission, type Permission } from "@/lib/permissions";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: Permission;
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard:view",
  },
  {
    name: "Manual POS Entry",
    href: "/dashboard/transactions/manual",
    icon: Receipt,
    permission: "transactions:manual",
  },
  {
    name: "Transactions",
    href: "/dashboard/transactions",
    icon: Receipt,
    permission: "transactions:view",
  },
  {
    name: "Branches",
    href: "/dashboard/branches",
    icon: Building2,
    permission: "branches:view",
  },
  {
    name: "Sales Analytics",
    href: "/dashboard/sales",
    icon: TrendingUp,
    permission: "sales:view",
  },
  {
    name: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    permission: "inventory:view",
  },
  {
    name: "Menu Management",
    href: "/dashboard/menu",
    icon: UtensilsCrossed,
    permission: "menu:view",
  },
  {
    name: "Categories",
    href: "/dashboard/categories",
    icon: Tag,
    permission: "categories:view",
  },
  {
    name: "Branch Targets",
    href: "/dashboard/targets",
    icon: Target,
    permission: "targets:view",
  },
  {
    name: "Staff",
    href: "/dashboard/staff",
    icon: Users,
    permission: "staff:view",
  },
  {
    name: "Alerts",
    href: "/dashboard/alerts",
    icon: Bell,
    permission: "alerts:view",
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: FileText,
    permission: "reports:view",
  },
  {
    name: "API Keys",
    href: "/dashboard/api-keys",
    icon: Key,
    permission: "api-keys:view",
  },
  {
    name: "Kitchen (KDS)",
    href: "/kitchen",
    icon: Users,
    permission: "kitchen:access",
  },
  {
    name: "POS",
    href: "/pos",
    icon: Receipt,
    permission: "pos:access",
  },
];

const bottomNavigation: NavItem[] = [
  {
    name: "User Management",
    href: "/dashboard/users",
    icon: UserCog,
    permission: "users:view",
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    permission: "settings:view",
  },
];

interface SidebarProps {
  className?: string;
  userRole?: Role;
}

export function Sidebar({ className, userRole = "CASHIER" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Filter navigation items based on user permissions
  const filteredNavigation = navigation.filter(
    (item) => !item.permission || hasPermission(userRole, item.permission)
  );
  const filteredBottomNavigation = bottomNavigation.filter(
    (item) => !item.permission || hasPermission(userRole, item.permission)
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

  return (
    <div
      className={cn(
        "flex h-full flex-col sidebar-blue transition-all duration-300 relative overflow-hidden",
        collapsed ? "w-[70px]" : "w-[260px]",
        className
      )}
    >
      {/* Blue gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-blue-500/5 via-transparent to-blue-600/5 pointer-events-none" />
      
      <div className={cn(
        "flex items-center relative z-10 py-0",
        collapsed ? "h-16 justify-center px-2" : "h-16 justify-between px-4"
      )}>
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-lg shadow-primary/25 shrink-0">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-sidebar-foreground truncate">
              Dinelytix
            </span>
          </Link>
        ) : (
          <Link href="/dashboard" className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-lg shadow-primary/25 mx-auto">
            <TrendingUp className="h-5 w-5 text-white" />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground shrink-0",
            collapsed && "absolute top-2 right-2"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Separator className="bg-sidebar-border" />

      <ScrollArea className="flex-1 px-3 py-4 overflow-y-auto">
        <nav className="space-y-1 min-w-0">
          {filteredNavigation.map((item) => {
            // Use exact matching to prevent parent routes from being active when on child routes
            // Exception: /dashboard only matches exact
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-smooth min-w-0",
                  isActive
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "text-sidebar-foreground/70 hover:bg-blue-500/5 hover:text-blue-600 dark:hover:text-blue-400",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    isActive && "text-blue-600 dark:text-blue-400"
                  )}
                />
                {!collapsed && <span className="truncate min-w-0">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="px-3 pb-4">
        <Separator className="mb-4 bg-sidebar-border" />
        <nav className="space-y-1">
          {filteredBottomNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-smooth",
                  isActive
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "text-sidebar-foreground/70 hover:bg-blue-500/5 hover:text-blue-600 dark:hover:text-blue-400",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-blue-600 dark:text-blue-400")} />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-smooth hover:bg-destructive/10 hover:text-destructive disabled:opacity-50",
              collapsed && "justify-center px-2"
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
