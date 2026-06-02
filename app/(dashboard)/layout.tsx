import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { FloatingChatWidget } from "@/components/chat";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasFeature } from "@/lib/tier-config";
import { getNotifications, getUnreadCount } from "@/lib/services/notifications";
import { PermissionsProvider } from "@/contexts/permissions-context";
import { loadSessionAccess } from "@/lib/permissions/load-session-access";
import { enforceRouteAccess } from "@/lib/permissions/page-access";
import { getRequestPathname } from "@/lib/permissions/request-pathname";

/** Auth and org resolution use request headers — do not statically prerender at build. */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await loadSessionAccess();
  if (!access) {
    redirect("/login");
  }

  const { role: userRole, permissions, organizationId, accessCtx } = access;
  const { orgTier, tableManagementEnabled: tablesNavEnabled } = accessCtx;
  const canUseAiAssistant = hasFeature(orgTier, "aiAssistant", userRole);

  const headerStore = await headers();
  const isServerAction = headerStore.has("next-action");
  if (!isServerAction) {
    const pathname = await getRequestPathname({ expectedPrefix: "/dashboard" });
    enforceRouteAccess(pathname, accessCtx);
  }

  const [notificationsResult, unreadResult] = await Promise.all([
    getNotifications(20),
    getUnreadCount(),
  ]);
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
          <div className="absolute top-0 right-0 w-[500px] h-[500px] gradient-orb gradient-orb-blue opacity-30 pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] gradient-orb gradient-orb-purple opacity-20 pointer-events-none" />

          <Header
            initialNotifications={initialNotifications}
            initialUnreadCount={initialUnreadCount}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">{children}</main>

          {canUseAiAssistant && <FloatingChatWidget />}
        </div>
      </div>
    </PermissionsProvider>
  );
}
