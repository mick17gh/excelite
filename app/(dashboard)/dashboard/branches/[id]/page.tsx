import { Suspense } from "react";
import { getBranchById } from "@/lib/actions/branches";
import { getTransactions, getSales } from "@/lib/actions/transactions";
import { getInventoryItems } from "@/lib/actions/inventory";
import { getStaffByBranch } from "@/lib/actions/staff";
import { getUsersByBranch } from "@/lib/actions/users";
import { getTargets } from "@/lib/actions/targets";
import { BranchDetailsContent } from "@/components/branches/branch-details-content";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Branch Details | ServStack",
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
    salesResult,
    inventoryResult,
    staffResult,
    usersResult,
    targetsResult,
  ] = await Promise.all([
    getBranchById(id),
    getTransactions(id),
    getSales(id),
    getInventoryItems(id),
    getStaffByBranch(id),
    getUsersByBranch(id),
    getTargets(id),
  ]);

  if (!branchResult.success || !branchResult.data) {
    notFound();
  }

  const branch = branchResult.data;
  const rawTransactions = transactionsResult.data || [];
  const rawSales = salesResult.data || [];
  const rawInventory = inventoryResult.data || [];
  const staff = staffResult.data || [];
  const users = usersResult.data || [];
  const targetsData = targetsResult.data || [];
  
  // Convert Decimal fields to numbers
  const transactions = rawTransactions.map((t: any) => ({
    ...t,
    amount: Number(t.amount),
  }));
  
  // Convert sales data (includes manual POS entries)
  const sales = rawSales.map((s: any) => ({
    ...s,
    total: Number(s.total),
    subtotal: Number(s.subtotal),
    tax: Number(s.tax),
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
          sales={sales}
          inventory={inventory}
          staff={staff}
          users={users}
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
