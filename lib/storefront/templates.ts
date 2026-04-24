export const STOREFRONT_TEMPLATES = [
  "classic",
  "modern",
  "quick",
  "marketplace",
  "minimal",
] as const;

export type StorefrontTemplateId = (typeof STOREFRONT_TEMPLATES)[number];

export function isValidTemplateId(value: string | null | undefined): value is StorefrontTemplateId {
  if (!value) return false;
  return (STOREFRONT_TEMPLATES as readonly string[]).includes(value);
}

export function normalizeTemplateId(
  value: string | null | undefined,
  fallback: StorefrontTemplateId = "classic"
): StorefrontTemplateId {
  return isValidTemplateId(value) ? value : fallback;
}
