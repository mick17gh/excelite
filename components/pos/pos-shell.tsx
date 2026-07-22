"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { ArrowLeft, LayoutDashboard, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { EXCELITE_BRAND } from "@/lib/excelite-config";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

interface PosShellProps {
  children: React.ReactNode;
  canViewOrders: boolean;
  canViewSettings: boolean;
  backHref: string;
}

function formatRole(role?: string | null) {
  if (!role) return "Member";
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function PosShell({
  children,
  canViewOrders,
  canViewSettings,
  backHref,
}: PosShellProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const user = {
    name: session?.user?.name?.trim() || "User",
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
    <div className="flex h-screen flex-col bg-[#F8FAF8] dark:bg-background">
      <header className="relative shrink-0 border-b border-[#222831]/10 bg-white dark:bg-card shadow-sm">
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-[#22C55E] to-transparent opacity-80" />
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={backHref}>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 shrink-0 text-[#222831] hover:bg-[#22C55E]/10 hover:text-[#16A34A]"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            <div className="h-6 w-px bg-border shrink-0" />
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#22C55E]/10 shrink-0">
                <Image
                  src={EXCELITE_BRAND.logo}
                  alt={`${EXCELITE_BRAND.name} logo`}
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-md"
                />
              </div>
              <div className="min-w-0 hidden sm:block">
                <p className="font-semibold text-[#222831] dark:text-foreground leading-tight truncate">
                  Point of Sale
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {EXCELITE_BRAND.shortName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex gap-2 text-muted-foreground hover:text-[#16A34A]"
              asChild
            >
              <Link href={backHref}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 gap-2 rounded-full px-2">
                  <Avatar className="h-7 w-7 ring-2 ring-[#22C55E]/20">
                    <AvatarImage src={user.image || undefined} alt={user.name} />
                    <AvatarFallback className="bg-[#22C55E] text-white text-xs">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden flex-col items-start text-left sm:flex">
                    <span className="text-sm font-medium max-w-[140px] truncate text-[#222831]">
                      {user.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{user.role}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    {user.email ? (
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    ) : null}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/dashboard/account">My account</a>
                </DropdownMenuItem>
                {canViewOrders ? (
                  <DropdownMenuItem asChild>
                    <a href="/dashboard/orders" className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Orders
                    </a>
                  </DropdownMenuItem>
                ) : null}
                {canViewSettings ? (
                  <DropdownMenuItem asChild>
                    <a href="/dashboard/settings">Settings</a>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-3 md:p-4">{children}</main>
    </div>
  );
}
