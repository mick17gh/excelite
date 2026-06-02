import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { loadSessionAccess } from "@/lib/permissions/load-session-access";
import { enforceRouteAccess } from "@/lib/permissions/page-access";

/** Load org permissions and redirect if pathname is not allowed (for routes outside dashboard layout). */
export async function enforcePageRouteAccess(pathname: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return;

  const access = await loadSessionAccess();
  if (!access) return;

  enforceRouteAccess(pathname, access.accessCtx);
}
