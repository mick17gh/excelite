"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";
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
import { useRouter } from "next/navigation";
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
    <div className="flex h-screen flex-col bg-muted/30">
      <header className="flex items-center justify-between border-b bg-background px-4 py-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={backHref}>
            <Button variant="ghost" size="sm" className="gap-2 shrink-0">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <div className="h-6 w-px bg-border shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-lg hidden sm:inline truncate">
              ServStack POS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 gap-2 rounded-full px-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.image || undefined} alt={user.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start text-left sm:flex">
                  <span className="text-sm font-medium max-w-[140px] truncate">
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
      </header>

      <main className="flex-1 overflow-hidden p-4">{children}</main>
    </div>
  );
}
