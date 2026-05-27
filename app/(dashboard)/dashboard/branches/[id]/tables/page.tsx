import { getBranchById } from "@/lib/actions/branches";
import { BranchTablesAdmin } from "@/components/tables/branch-tables-admin";
import { isTableManagementEnabledForBranch } from "@/lib/features/table-management";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Branch Tables | ServStack",
};

export default async function BranchTablesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const branchResult = await getBranchById(id);
  if (!branchResult.success || !branchResult.data) {
    notFound();
  }

  const enabled = await isTableManagementEnabledForBranch(id);
  if (!enabled) {
    redirect("/dashboard/settings");
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/dashboard/branches/${id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to branch
        </Link>
      </Button>
      <BranchTablesAdmin branchId={id} branchName={branchResult.data.name} />
    </div>
  );
}
