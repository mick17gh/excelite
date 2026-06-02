import { requireSessionAccess, sessionHasPermission } from "@/lib/permissions/load-session-access";
import { resolveSafeLandingHref } from "@/lib/permissions/routes";
import { PosShell } from "@/components/pos/pos-shell";

export const dynamic = "force-dynamic";

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requireSessionAccess();
  const canViewOrders = sessionHasPermission(access, "orders:view");
  const canViewSettings = sessionHasPermission(access, "settings:view");
  const backHref = resolveSafeLandingHref(access.accessCtx);

  return (
    <PosShell
      canViewOrders={canViewOrders}
      canViewSettings={canViewSettings}
      backHref={backHref}
    >
      {children}
    </PosShell>
  );
}
