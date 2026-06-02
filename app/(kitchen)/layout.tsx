import { requireSessionAccess, sessionHasPermission } from "@/lib/permissions/load-session-access";
import { resolveSafeLandingHref } from "@/lib/permissions/routes";
import { KitchenShell } from "@/components/kitchen/kitchen-shell";

export const dynamic = "force-dynamic";

export default async function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requireSessionAccess();
  const canViewOrders = sessionHasPermission(access, "orders:view");
  const canViewDashboard = sessionHasPermission(access, "dashboard:view");
  const backHref = resolveSafeLandingHref(access.accessCtx);

  return (
    <KitchenShell
      canViewOrders={canViewOrders}
      canViewDashboard={canViewDashboard}
      backHref={backHref}
    >
      {children}
    </KitchenShell>
  );
}
