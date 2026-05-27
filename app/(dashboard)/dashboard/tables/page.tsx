import { getBranches } from "@/lib/actions/branches";
import { FloorBoardContent } from "@/components/tables/floor-board-content";
import { isTableManagementEnabled } from "@/lib/features/table-management";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { hasPermission } from "@/lib/permissions";
import { Role } from "@/lib/generated/prisma/client";

export const metadata = {
  title: "Floor Board | ServStack",
  description: "Live table status and covers on the floor",
};

export default async function FloorBoardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user?.role as Role) || "STAFF";
  if (!hasPermission(role, "tables:view")) {
    redirect("/dashboard");
  }

  const org = await db.organization.findFirst({
    select: { id: true },
  });
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
