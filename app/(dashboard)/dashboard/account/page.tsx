import { PageHeader } from "@/components/dashboard/page-header";
import { AccountContent } from "@/components/account/account-content";
import { enforcePageRouteAccess } from "@/lib/permissions/enforce-page";

export const metadata = {
  title: "My Account",
  description: "Update your password and view account details",
};

export default async function AccountPage() {
  await enforcePageRouteAccess("/dashboard/account");

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Account"
        description="Manage your password and view your profile"
      />
      <AccountContent />
    </div>
  );
}
