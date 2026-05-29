export type WarehouseOutboundReason = "USAGE" | "ADJUSTMENT";

export function warehouseOutboundReasonLabel(reason: string): string {
  if (reason === "USAGE") return "Normal Usage";
  if (reason === "ADJUSTMENT") return "Adjustment";
  return reason;
}
