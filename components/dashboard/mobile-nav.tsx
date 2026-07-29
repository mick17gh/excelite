"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Role, SubscriptionTier } from "@/lib/generated/prisma/client";
import { usePermissions } from "@/contexts/permissions-context";
import {
  MOBILE_MORE_NAV,
  MOBILE_PRIMARY_NAV,
  filterNavItems,
  type RouteAccessContext,
} from "@/lib/permissions/routes";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MobileNavProps {
  orgTier?: SubscriptionTier;
  tableManagementEnabled?: boolean;
}

export function MobileNav({
  orgTier = "FREE",
  tableManagementEnabled = false,
}: MobileNavProps) {
  const { permissions, role } = usePermissions();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const accessCtx: RouteAccessContext = useMemo(
    () => ({ permissions, orgTier, tableManagementEnabled, role }),
    [permissions, orgTier, tableManagementEnabled, role],
  );

  const primaryNav = useMemo(() => filterNavItems(MOBILE_PRIMARY_NAV, accessCtx), [accessCtx]);
  const moreNav = useMemo(() => filterNavItems(MOBILE_MORE_NAV, accessCtx), [accessCtx]);

  const isMoreActive = moreNav.some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")),
  );

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around">
        {primaryNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors cursor-pointer",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              {item.name}
            </Link>
          );
        })}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors cursor-pointer",
                isMoreActive || moreOpen
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              More
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-2 py-4">
              {moreNav.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors cursor-pointer",
                      isActive
                        ? "border-primary/30 bg-primary/5 text-primary"
                        : "border-border hover:bg-muted/50",
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
