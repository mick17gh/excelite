import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { Header } from "@/components/dashboard/header";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getNotifications, getUnreadCount } from "@/lib/services/notifications";
import { PermissionsProvider } from "@/contexts/permissions-context";
import { resolveSessionAccess } from "@/lib/permissions/load-session-access";
import { enforceRouteAccess } from "@/lib/permissions/page-access";
import { getRequestPathname } from "@/lib/permissions/request-pathname";
import { PaystackSetupBanner } from "@/components/dashboard/paystack-setup-banner";
import { db } from "@/lib/db";
import { isPaystackAnyChannelEnabledForOrg } from "@/lib/paystack/credentials";

/** Auth and org resolution use request headers — do not statically prerender at build. */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionResult = await resolveSessionAccess();
  if (sessionResult.kind === "unauthenticated") {
    redirect("/login");
  }
  if (sessionResult.kind === "onboarding") {
    redirect("/onboarding");
  }

  const { role: userRole, permissions, organizationId, accessCtx } =
    sessionResult.access;
  const { orgTier, tableManagementEnabled: tablesNavEnabled } = accessCtx;

  const headerStore = await headers();
  const isServerAction = headerStore.has("next-action");
  if (!isServerAction) {
    const pathname = await getRequestPathname({ expectedPrefix: "/dashboard" });
    enforceRouteAccess(pathname, accessCtx);
  }

  const [notificationsResult, unreadResult, orgPaystack, firstBranch] = await Promise.all([
    getNotifications(20),
    getUnreadCount(),
    db.organization.findUnique({
      where: { id: organizationId },
      select: {
        paystackEnabled: true,
        paystackDashboardEnabled: true,
        features: true,
      },
    }),
    db.branch.findFirst({
      where: { organizationId, deletedAt: null, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const paystackAnyEnabled = orgPaystack
    ? isPaystackAnyChannelEnabledForOrg(orgPaystack)
    : false;
  const initialNotifications =
    notificationsResult.success && notificationsResult.data
      ? notificationsResult.data
      : [];
  const initialUnreadCount = unreadResult.success ? unreadResult.count : 0;

  return (
    <PermissionsProvider
      permissions={permissions}
      role={userRole}
      organizationId={organizationId}
    >
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          className="hidden md:flex"
          orgTier={orgTier}
          tableManagementEnabled={tablesNavEnabled}
        />
        <div className="flex flex-1 flex-col overflow-hidden relative">
          <div className="absolute inset-0 gradient-mesh pointer-events-none" />

          <Header
            initialNotifications={initialNotifications}
            initialUnreadCount={initialUnreadCount}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 relative z-10">
            <div className="mx-auto w-full max-w-7xl space-y-4">
            <PaystackSetupBanner
              organizationId={organizationId}
              paystackEnabled={paystackAnyEnabled}
              firstBranch={firstBranch}
            />
            {children}
            </div>
          </main>

          <MobileNav orgTier={orgTier} tableManagementEnabled={tablesNavEnabled} />
        </div>
      </div>
    </PermissionsProvider>
  );
}
