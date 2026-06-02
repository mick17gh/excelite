import { AccountContent } from "@/components/account/account-content";
import { enforcePageRouteAccess } from "@/lib/permissions/enforce-page";

export const metadata = {
  title: "My Account | ServStack",
  description: "Update your password and view account details",
};

export default async function AccountPage() {
  await enforcePageRouteAccess("/dashboard/account");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">My Account</h1>
        <p className="text-muted-foreground text-sm">
          Manage your password and view your profile
        </p>
      </div>
      <AccountContent />
    </div>
  );
}
