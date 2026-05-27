"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { ArrowLeft, LayoutDashboard, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export default function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

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
      {/* POS Header */}
      <header className="flex items-center justify-between border-b bg-background px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-lg hidden sm:inline">ServStack POS</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </Link>
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {isSigningOut ? "Signing out..." : "Sign Out"}
            </span>
          </Button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-4">
        {children}
      </main>
    </div>
  );
}
