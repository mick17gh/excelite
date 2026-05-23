/**
 * Normalize a storefront URL for storage and POS QR codes.
 * Returns null when empty or invalid.
 */
export function normalizeStorefrontUrl(input: string | null | undefined): string | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  return parsed.toString().replace(/\/$/, "") || parsed.toString();
}
