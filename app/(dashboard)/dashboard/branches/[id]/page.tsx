import { Suspense } from "react";
import { getBranchById } from "@/lib/actions/branches";
import { getTransactions, getSales } from "@/lib/actions/transactions";
import { getInventoryItems } from "@/lib/actions/inventory";
import { getStaffByBranch } from "@/lib/actions/staff";
import { getUsersByBranch } from "@/lib/actions/users";
import { getTargets } from "@/lib/actions/targets";
import { BranchDetailsContent } from "@/components/branches/branch-details-content";
import { notFound } from "next/navigation";
import { isTableManagementEnabled, isTableManagementEnabledForBranch } from "@/lib/features/table-management";

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

  // Defensive serialization guard for client component props.
  // Some environments can still retain Prisma Decimal wrappers in nested payloads.
  const branch = {
    ...JSON.parse(JSON.stringify(branchResult.data)),
    taxRate: Number((branchResult.data as any).taxRate ?? 0),
    latitude:
      (branchResult.data as any).latitude != null
        ? Number((branchResult.data as any).latitude)
        : null,
    longitude:
      (branchResult.data as any).longitude != null
        ? Number((branchResult.data as any).longitude)
        : null,
  };
  const rawTransactions = transactionsResult.data || [];
  const rawSales = salesResult.data || [];
  const rawInventory = inventoryResult.data || [];
  const staff = staffResult.data || [];
  const users = usersResult.data || [];
  const targetsData = targetsResult.data || [];
  
  // Convert Decimal fields to numbers
  const transactions = rawTransactions.map((t: any) => ({
    id: t.id,
    transactionRef: t.transactionRef,
    amount: Number(t.amount),
    paymentMethod: t.paymentMethod,
    transactionDate: t.transactionDate,
  }));
  
  // Convert sales data (includes manual POS entries)
  const sales = rawSales.map((s: any) => ({
    id: s.id,
    saleNumber: s.saleNumber,
    total: Number(s.total),
    subtotal: Number(s.subtotal),
    tax: Number(s.tax),
    channel: s.channel,
    dayPart: s.dayPart,
    saleDate: s.saleDate,
  }));
  
  const inventory = rawInventory.map((item: any) => ({
    id: item.id,
    name: item.name,
    currentStock: Number(item.currentStock),
    unitCost: Number(item.unitCost),
    status: item.status,
  }));
  
  // Targets already converted in getTargets action
  const targets = targetsData;
  const orgTableManagementEnabled = branch.organizationId
    ? await isTableManagementEnabled(branch.organizationId)
    : false;
  const tableManagementEnabled = await isTableManagementEnabledForBranch(id);

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
          tableManagementEnabled={tableManagementEnabled}
          orgTableManagementEnabled={orgTableManagementEnabled}
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
