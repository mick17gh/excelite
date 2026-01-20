import { Suspense } from "react";
import { getBranchById } from "@/lib/actions/branches";
import { getTransactions } from "@/lib/actions/transactions";
import { getInventoryItems } from "@/lib/actions/inventory";
import { getStaffByBranch } from "@/lib/actions/staff";
import { getTargets } from "@/lib/actions/targets";
import { BranchDetailsContent } from "@/components/branches/branch-details-content";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Branch Details | Dinelytix",
  description: "Comprehensive branch information and analytics",
};

export default async function BranchDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [
    branchResult,
    transactionsResult,
    inventoryResult,
    staffResult,
    targetsResult,
  ] = await Promise.all([
    getBranchById(id),
    getTransactions(id),
    getInventoryItems(id),
    getStaffByBranch(id),
    getTargets(id),
  ]);

  if (!branchResult.success || !branchResult.data) {
    notFound();
  }

  const branch = branchResult.data;
  const rawTransactions = transactionsResult.data || [];
  const rawInventory = inventoryResult.data || [];
  const staff = staffResult.data || [];
  const targetsData = targetsResult.data || [];
  
  // Convert Decimal fields to numbers
  const transactions = rawTransactions.map((t: any) => ({
    ...t,
    amount: Number(t.amount),
  }));
  
  const inventory = rawInventory.map((item: any) => ({
    ...item,
    currentStock: Number(item.currentStock),
    unitCost: Number(item.unitCost),
  }));
  
  // Targets already converted in getTargets action
  const targets = targetsData;

  return (
    <div className="space-y-6">
      <Suspense fallback={<BranchDetailsLoadingSkeleton />}>
        <BranchDetailsContent
          branch={branch}
          transactions={transactions}
          inventory={inventory}
          staff={staff}
          targets={targets}
        />
      </Suspense>
    </div>
  );
}

function BranchDetailsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-96 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
