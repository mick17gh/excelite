import { Suspense } from "react";
import { TransactionsContent } from "@/components/transactions/transactions-content";
import { getBranches } from "@/lib/actions/branches";
import { getMenuItems } from "@/lib/actions/menu";
import { getTransactions } from "@/lib/actions/transactions";

export const metadata = {
  title: "Transactions",
  description: "Record and manage daily transactions",
};

export default async function TransactionsPage() {
  const [branchesResult, menuItemsResult] = await Promise.all([
    getBranches(),
    getMenuItems(),
  ]);

  const branchList0 = branchesResult.data || [];
  const firstBranchId = branchList0.length > 0 ? (branchList0[0] as any).id : undefined;
  const txnResult = firstBranchId ? await getTransactions(firstBranchId, new Date()) : { data: [] };

  const branchList = (branchesResult.data || []).map((branch: any) => {
    const { taxRate, ...rest } = branch;
    return {
      ...rest,
      taxRate: taxRate ? Number(taxRate) : 0,
    };
  });
  const rawMenuItems = menuItemsResult.data || [];
  const menuItems = rawMenuItems.map((item: any) => ({
    id: item.id,
    name: item.name,
    price: Number(item.price),
    cost: item.cost ? Number(item.cost) : undefined,
    category: item.category,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Transaction Entry
        </h1>
        <p className="text-muted-foreground">
          Record daily sales and transactions for your branch
        </p>
      </div>

      <Suspense fallback={<TransactionsLoadingSkeleton />}>
        <TransactionsContent branches={branchList} menuItems={menuItems} initialTransactions={txnResult.data || []} />
      </Suspense>
    </div>
  );
}

function TransactionsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-96 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
