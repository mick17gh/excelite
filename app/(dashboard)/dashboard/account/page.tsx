import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { AccountContent } from "@/components/account/account-content";
import { enforcePageRouteAccess } from "@/lib/permissions/enforce-page";

export const metadata = {
  title: "My Account",
  description: "Update your password and view account details",
};

export default function AccountPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="My Account"
        description="Manage your password and view your profile"
      />
      <Suspense fallback={<DashboardPageSkeleton kpiCount={0} />}>
        <AccountPageData />
      </Suspense>
    </div>
  );
}

async function AccountPageData() {
  await enforcePageRouteAccess("/dashboard/account");
  return <AccountContent />;
}
