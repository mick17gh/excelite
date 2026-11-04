function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

/** Staff-only host: / → login/dashboard. Overrides marketing and storefront. */
export function isHideLandingPage(): boolean {
  return isTruthyEnv(process.env.NEXT_PUBLIC_HIDE_LANDING_PAGE);
}

/**
 * Org id for the single-tenant storefront.
 * Prefer NEXT_PUBLIC_ so Edge middleware can see it (org id is already public in API URLs).
 */
export function getStorefrontOrgId(): string | null {
  const id = (
    process.env.NEXT_PUBLIC_STOREFRONT_ORG_ID ||
    process.env.STOREFRONT_ORG_ID ||
    ""
  ).trim();
  return id || null;
}

/**
 * True when this deployment should serve the customer storefront at `/`.
 * Routing/middleware only keys off the public surface flag + hide-landing
 * (Edge middleware cannot reliably read non-NEXT_PUBLIC secrets).
 * Pages still require an org id via getStorefrontOrgId().
 */
export function isStorefrontSurface(): boolean {
  if (isHideLandingPage()) return false;
  const surface = (process.env.NEXT_PUBLIC_APP_SURFACE || "platform").toLowerCase();
  return surface === "storefront";
}

/** Paths that only exist in storefront surface mode (besides `/`). */
export function isStorefrontOnlyPath(pathname: string): boolean {
  if (pathname === "/checkout" || pathname.startsWith("/checkout/")) return true;
  if (pathname === "/track" || pathname.startsWith("/track/")) return true;
  if (pathname === "/order" || pathname.startsWith("/order/")) return true;
  return false;
}
