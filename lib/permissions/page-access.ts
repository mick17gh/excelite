import "server-only";

import { redirect } from "next/navigation";
import {
  canAccessPath,
  getFirstAccessibleNavHref,
  isAuthOnlyPath,
  resolveSafeLandingHref,
  type RouteAccessContext,
} from "@/lib/permissions/routes";

const ACCOUNT_PATH = "/dashboard/account";

/** Redirect when the current path is not allowed for this user/org. */
export function enforceRouteAccess(pathname: string, ctx: RouteAccessContext): void {
  // Pathname can be missing on RSC sub-requests and server actions (stale /pos cookie).
  // Skip rather than guessing — page-level guards use explicit paths when needed.
  if (!pathname) return;

  if (isAuthOnlyPath(pathname) || canAccessPath(pathname, ctx)) return;

  redirect(resolveSafeLandingHref(ctx));
}
