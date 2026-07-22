import { getBranches } from "@/lib/actions/branches";
import { FloorBoardContent } from "@/components/tables/floor-board-content";
import { isTableManagementEnabled } from "@/lib/features/table-management";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getEffectivePermissions, hasPermissionInList } from "@/lib/permissions/resolver";
import { Role } from "@/lib/generated/prisma/client";

export const metadata = {
  title: "Floor Board",
  description: "Live table status and covers on the floor",
};

export default async function FloorBoardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user?.role as Role) || "STAFF";
  const org = await db.organization.findFirst({
    select: { id: true },
  });
  const permissions = org ? await getEffectivePermissions(org.id, role) : [];
  if (!hasPermissionInList(permissions, "tables:view")) {
    redirect("/dashboard");
  }
  if (!org || !(await isTableManagementEnabled(org.id))) {
    redirect("/dashboard/settings");
  }

  const branchesResult = await getBranches();
  const branches = (branchesResult.data || []).map((b) => ({
    id: b.id,
    name: b.name,
  }));

  return (
    <FloorBoardContent
      branches={branches}
      defaultBranchId={session?.user?.branchId ?? undefined}
      userRole={role}
    />
  );
}
