import "server-only";

import { cookies, headers } from "next/headers";
import { REQUEST_PATHNAME_COOKIE } from "@/lib/permissions/constants";

type GetRequestPathnameOptions = {
  /** Ignore cookie values that don't match this prefix (avoids stale /pos cookie on dashboard). */
  expectedPrefix?: string;
};

/** Pathname for route guards (middleware header + cookie fallback). */
export async function getRequestPathname(
  options?: GetRequestPathnameOptions,
): Promise<string> {
  const headerStore = await headers();
  const fromHeader = headerStore.get("x-pathname");
  if (fromHeader) return fromHeader;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(REQUEST_PATHNAME_COOKIE)?.value;
  if (fromCookie) {
    if (!options?.expectedPrefix || fromCookie.startsWith(options.expectedPrefix)) {
      return fromCookie;
    }
  }

  const nextUrl = headerStore.get("x-url") ?? headerStore.get("next-url");
  if (nextUrl) {
    try {
      const pathname = new URL(nextUrl, "http://localhost").pathname;
      if (!options?.expectedPrefix || pathname.startsWith(options.expectedPrefix)) {
        return pathname;
      }
    } catch {
      /* ignore malformed */
    }
  }

  const referer = headerStore.get("referer");
  if (referer) {
    try {
      const pathname = new URL(referer).pathname;
      if (!options?.expectedPrefix || pathname.startsWith(options.expectedPrefix)) {
        return pathname;
      }
    } catch {
      /* ignore malformed */
    }
  }

  return "";
}
