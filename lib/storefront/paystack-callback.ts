import { resolveAllowedStorefrontOrigins, type PublicStoreConfig } from "@/lib/storefront/config";

/** Build Paystack return URL from the current browser/deployment origin. */
export function buildPaystackCallbackUrl(origin: string, orderNumber: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/order/${encodeURIComponent(orderNumber)}?paystack=1`;
}

export function isAllowedPaystackCallbackUrl(
  callbackUrl: string,
  options: {
    requestOrigin?: string | null;
    orgConfig?: PublicStoreConfig | null;
  },
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(callbackUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (!parsed.pathname.startsWith("/order/")) return false;

  const allowed = new Set<string>();
  if (options.requestOrigin) {
    try {
      allowed.add(new URL(options.requestOrigin).origin);
    } catch {
      /* ignore */
    }
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      allowed.add(new URL(appUrl).origin);
    } catch {
      /* ignore */
    }
  }
  if (options.orgConfig) {
    for (const origin of resolveAllowedStorefrontOrigins(options.orgConfig)) {
      try {
        allowed.add(new URL(origin).origin);
      } catch {
        /* ignore */
      }
    }
  }

  if (allowed.size === 0) return true;
  return allowed.has(parsed.origin);
}

export function resolvePaystackCallbackFromRequest(
  req: { headers: Headers },
  orderNumber: string,
  clientCallbackUrl?: string | null,
): string | null {
  if (clientCallbackUrl) return clientCallbackUrl;

  const originHeader = req.headers.get("origin");
  if (originHeader) return buildPaystackCallbackUrl(originHeader, orderNumber);

  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return null;
  return buildPaystackCallbackUrl(`${proto}://${host}`, orderNumber);
}
