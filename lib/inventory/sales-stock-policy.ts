import { db } from "@/lib/db";

export type StockPolicyContext = {
  organizationId: string;
  orgBlockSalesWhenOutOfStock: boolean;
  branchBlockSalesWhenOutOfStock: boolean | null;
};

export function effectiveBlockSalesWhenOutOfStock(ctx: StockPolicyContext): boolean {
  if (ctx.branchBlockSalesWhenOutOfStock !== null && ctx.branchBlockSalesWhenOutOfStock !== undefined) {
    return ctx.branchBlockSalesWhenOutOfStock;
  }
  return ctx.orgBlockSalesWhenOutOfStock;
}

export async function loadStockPolicyForBranch(branchId: string): Promise<StockPolicyContext | null> {
  const branch = await db.branch.findUnique({
    where: { id: branchId },
    select: {
      blockSalesWhenOutOfStock: true,
      organization: {
        select: {
          id: true,
          blockSalesWhenOutOfStock: true,
        },
      },
    },
  });

  if (!branch?.organization) return null;

  return {
    organizationId: branch.organization.id,
    orgBlockSalesWhenOutOfStock: branch.organization.blockSalesWhenOutOfStock,
    branchBlockSalesWhenOutOfStock: branch.blockSalesWhenOutOfStock,
  };
}

export async function isBlockingSalesWhenOutOfStock(branchId: string): Promise<boolean> {
  const ctx = await loadStockPolicyForBranch(branchId);
  if (!ctx) return false;
  return effectiveBlockSalesWhenOutOfStock(ctx);
}
