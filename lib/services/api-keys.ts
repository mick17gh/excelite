import { db } from "@/lib/db";

export type ApiScope =
  | "menu:read"
  | "categories:read"
  | "branches:read"
  | "inventory:read"
  | "sales:read";

export interface ApiKeyAuthResult {
  ok: boolean;
  error?: string;
  branchId?: string | null;
  scopes?: Set<ApiScope>;
}

function parseScopes(scopes: string): Set<ApiScope> {
  const set = new Set<ApiScope>();
  for (const raw of scopes.split(",")) {
    const s = raw.trim();
    if (!s) continue;
    set.add(s as ApiScope);
  }
  return set;
}

export async function authenticateApiKey(
  apiKey: string | null,
  requiredScope?: ApiScope
): Promise<ApiKeyAuthResult> {
  if (!apiKey) return { ok: false, error: "Missing API key" };

  const record = await db.apiKey.findUnique({
    where: { key: apiKey },
  });

  if (!record || !record.isActive) return { ok: false, error: "Invalid API key" };

  const scopes = parseScopes(record.scopes || "");
  if (requiredScope && !scopes.has(requiredScope)) {
    return { ok: false, error: "Insufficient scope" };
  }

  return { ok: true, branchId: record.branchId, scopes };
}

