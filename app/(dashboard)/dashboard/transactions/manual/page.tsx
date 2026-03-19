import { Suspense } from "react";
import { getBranches } from "@/lib/actions/branches";
import { ManualTransactionsContent } from "@/components/transactions/manual-transactions-content";

export const metadata = {
  title: "Manual POS Entry | ServStack",
  description: "Capture summarized sales from external POS systems for reporting.",
};

export default async function ManualTransactionsPage() {
  const branchesResult = await getBranches();
  const branchList = (branchesResult.data || []).map((branch: any) => {
    const { taxRate, ...rest } = branch;
    return {
      ...rest,
      taxRate: taxRate ? Number(taxRate) : 0,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Manual POS Entry
        </h1>
        <p className="text-muted-foreground">
          Enter daily or weekly summarized sales from your existing POS to keep
          executive analytics up to date.
        </p>
      </div>

      <Suspense fallback={<ManualTransactionsLoadingSkeleton />}>
        <ManualTransactionsContent branches={branchList} />
      </Suspense>
    </div>
  );
}

function ManualTransactionsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-96 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

