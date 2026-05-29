export const VARIANCE_REASONS = [
  "Spoilage / waste found",
  "Spillage / prep loss",
  "Theft / unexplained",
  "Count error (prior period)",
  "Unrecorded sale / missing recipe",
  "Other",
] as const;

export type VarianceReason = (typeof VARIANCE_REASONS)[number];

export function movementTypeForReason(reason: string | undefined): "ADJUSTMENT_LOSS" | "ADJUSTMENT_DAMAGE" {
  if (reason === "Spoilage / waste found" || reason === "Spillage / prep loss") {
    return "ADJUSTMENT_DAMAGE";
  }
  return "ADJUSTMENT_LOSS";
}
