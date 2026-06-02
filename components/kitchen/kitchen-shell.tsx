"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { ArrowLeft, ChefHat, LayoutDashboard, ShoppingCart, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KitchenShellProps {
  children: React.ReactNode;
  canViewOrders: boolean;
  canViewDashboard: boolean;
  backHref: string;
}

export function KitchenShell({
  children,
  canViewOrders,
  canViewDashboard,
  backHref,
}: KitchenShellProps) {
  return (
    <div className="flex h-screen flex-col bg-muted/30">
      <header className="flex items-center justify-between border-b bg-background px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link href={backHref}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <ChefHat className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg hidden sm:inline">Kitchen Display</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/dashboard/account">
            <Button variant="outline" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </Button>
          </a>
          {canViewOrders ? (
            <a href="/dashboard/orders">
              <Button variant="outline" size="sm" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Orders</span>
              </Button>
            </a>
          ) : null}
          {canViewDashboard ? (
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
          ) : null}
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-4">{children}</main>
    </div>
  );
}
