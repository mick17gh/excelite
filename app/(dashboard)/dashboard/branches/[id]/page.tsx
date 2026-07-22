import { Suspense } from "react";
import { serializeBranchScalarsForClient } from "@/lib/branches/serialize-client";
import { getTransactions, getSales } from "@/lib/actions/transactions";
import { getInventoryItems } from "@/lib/actions/inventory";
import { getStaffByBranch } from "@/lib/actions/staff";
import { getUsersByBranch } from "@/lib/actions/users";
import { getTargets } from "@/lib/actions/targets";
import { BranchDetailsContent } from "@/components/branches/branch-details-content";
import { notFound } from "next/navigation";
import { isTableManagementEnabled, isTableManagementEnabledForBranch } from "@/lib/features/table-management";
import { db } from "@/lib/db";
import { isPaystackAnyChannelEnabledForOrg } from "@/lib/paystack/credentials";

export const metadata = {
  title: "Branch Details",
  description: "Comprehensive branch information and analytics",
};

export default async function BranchDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [
    branchRecord,
    transactionsResult,
    salesResult,
    inventoryResult,
    staffResult,
    usersResult,
    targetsResult,
  ] = await Promise.all([
    db.branch.findUnique({ where: { id } }),
    getTransactions(id),
    getSales(id),
    getInventoryItems(id),
    getStaffByBranch(id),
    getUsersByBranch(id),
    getTargets(id),
  ]);

  if (!branchRecord) {
    notFound();
  }

  const branch = serializeBranchScalarsForClient(branchRecord);
  const rawTransactions = transactionsResult.data || [];
  const rawSales = salesResult.data || [];
  const rawInventory = inventoryResult.data || [];
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
  
  const staff = (staffResult.data ?? []).map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    role: s.role,
    dutyStatus: s.dutyStatus,
  }));

  const users = (usersResult.data ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    branchId: u.branchId,
    branchName: u.branchName,
    isActive: u.isActive,
    createdAt:
      u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
  }));

  const targets = (targetsData as Array<Record<string, unknown>>).map((target) => ({
    id: String(target.id),
    targetType: String(target.targetType),
    period: String(target.period),
    targetValue: Number(target.targetValue),
    currentValue: Number(target.currentValue),
    periodStart:
      target.periodStart instanceof Date
        ? target.periodStart.toISOString()
        : String(target.periodStart),
    periodEnd:
      target.periodEnd instanceof Date
        ? target.periodEnd.toISOString()
        : String(target.periodEnd),
  }));
  const orgTableManagementEnabled = branch.organizationId
    ? await isTableManagementEnabled(branch.organizationId)
    : false;
  const tableManagementEnabled = await isTableManagementEnabledForBranch(id);

  let paystackEnabled = false;
  if (branch.organizationId) {
    const org = await db.organization.findUnique({
      where: { id: branch.organizationId },
      select: { paystackEnabled: true, paystackDashboardEnabled: true, features: true },
    });
    if (org) paystackEnabled = isPaystackAnyChannelEnabledForOrg(org);
  }

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
          paystackEnabled={paystackEnabled}
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
