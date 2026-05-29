"use server";

import {
  checkCartStockAvailable,
  checkMenuItemStock,
  filterSellableMenuItemIds,
  type StockCheckLine,
} from "@/lib/services/menu-stock-availability";
import {
  isBlockingSalesWhenOutOfStock,
  loadStockPolicyForBranch,
} from "@/lib/inventory/sales-stock-policy";
import { assertCartStockAvailable } from "@/lib/services/menu-stock-availability";

export async function getBranchStockPolicy(branchId: string) {
  try {
    if (!branchId) {
      return { success: false, error: "Branch is required" };
    }
    const [blocking, ctx] = await Promise.all([
      isBlockingSalesWhenOutOfStock(branchId),
      loadStockPolicyForBranch(branchId),
    ]);
    return {
      success: true,
      data: {
        blockSalesWhenOutOfStock: blocking,
        branchOverride: ctx?.branchBlockSalesWhenOutOfStock ?? null,
        orgDefault: ctx?.orgBlockSalesWhenOutOfStock ?? false,
      },
    };
  } catch (error) {
    console.error("[getBranchStockPolicy]", error);
    return { success: false, error: "Failed to load stock policy" };
  }
}

export async function getMenuStockAvailability(branchId: string, menuItemIds: string[]) {
  try {
    if (!branchId) {
      return { success: false, error: "Branch is required" };
    }
    const blocking = await isBlockingSalesWhenOutOfStock(branchId);
    if (!blocking) {
      return {
        success: true,
        data: {
          blocking: false,
          sellableIds: menuItemIds,
          unsellableIds: [] as string[],
        },
      };
    }

    const sellableSet = await filterSellableMenuItemIds(branchId, menuItemIds);
    const sellableIds = [...sellableSet];
    const unsellableIds = menuItemIds.filter((id) => !sellableSet.has(id));

    return {
      success: true,
      data: { blocking: true, sellableIds, unsellableIds },
    };
  } catch (error) {
    console.error("[getMenuStockAvailability]", error);
    return { success: false, error: "Failed to check stock availability" };
  }
}

export async function validateMenuItemStockForSale(
  branchId: string,
  menuItemId: string,
  quantity: number,
  menuItemOptionIds?: string[]
) {
  try {
    const result = await checkMenuItemStock(branchId, menuItemId, quantity, menuItemOptionIds);
    if (result.sellable) return { success: true, data: result };
    const first = result.shortages[0];
    return {
      success: false,
      error: first
        ? `Insufficient ${first.name} (need ${first.required}, have ${first.available})`
        : "Item is out of stock",
      data: result,
    };
  } catch (error) {
    console.error("[validateMenuItemStockForSale]", error);
    return { success: false, error: "Stock check failed" };
  }
}

export async function validateCartStockForSale(branchId: string, lines: StockCheckLine[]) {
  try {
    const result = await assertCartStockAvailable(branchId, lines);
    if (!result.ok) return { success: false, error: result.error };
    return { success: true };
  } catch (error) {
    console.error("[validateCartStockForSale]", error);
    return { success: false, error: "Stock check failed" };
  }
}

export { checkCartStockAvailable, assertCartStockAvailable };
export type { StockCheckLine };
