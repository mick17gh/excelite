import { db } from "@/lib/db";
import type { WarehouseType } from "@/lib/generated/prisma/client";

export async function validateDirectToBranchTransfer(
  warehouseId: string,
  warehouseItemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [warehouse, item] = await Promise.all([
    db.warehouse.findUnique({
      where: { id: warehouseId },
      select: { warehouseType: true, organizationId: true },
    }),
    db.warehouseInventoryItem.findUnique({
      where: { id: warehouseItemId },
      select: {
        requiresCommissaryProcessing: true,
        allowDirectToBranch: true,
      },
    }),
  ]);

  if (!warehouse || !item) {
    return { ok: false, error: "Warehouse or item not found" };
  }

  if (warehouse.warehouseType !== "RAW") {
    return { ok: true };
  }

  const org = await db.organization.findUnique({
    where: { id: warehouse.organizationId },
    select: { enforceCommissaryRouting: true },
  });

  if (!org?.enforceCommissaryRouting) {
    return { ok: true };
  }

  if (item.requiresCommissaryProcessing && !item.allowDirectToBranch) {
    return {
      ok: false,
      error:
        "This SKU must be processed at commissary before branch dispatch. Enable direct-to-branch on the item or turn off strict routing.",
    };
  }

  return { ok: true };
}

export function assertWarehouseTypes(
  fromType: WarehouseType,
  toType: WarehouseType,
  kind: "material_issue" | "general",
): { ok: true } | { ok: false; error: string } {
  if (kind === "material_issue") {
    if (fromType !== "RAW" || toType !== "COMMISSARY") {
      return {
        ok: false,
        error: "Material issue transfers must be from RAW warehouse to COMMISSARY",
      };
    }
    return { ok: true };
  }
  if (fromType === toType) {
    return { ok: false, error: "Source and destination warehouses must differ" };
  }
  return { ok: true };
}
