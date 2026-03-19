import { db } from "@/lib/db";

export type ApiScope =
  | "menu:read"
  | "menu:write"
  | "categories:read"
  | "branches:read"
  | "inventory:read"
  | "inventory:write"
  | "sales:read"
  | "sales:write"
  | "orders:read"
  | "orders:write"
  | "analytics:read"
  | "staff:read"
  | "reports:read"
  | "customers:read"
  | "customers:write"
  | "warehouse:read"
  | "warehouse:write"
  | "delivery:read"
  | "delivery:write"
  | "payments:read"
  | "payments:write";

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
  console.log("[authenticateApiKey] Received API key:", apiKey ? `${apiKey.substring(0, 10)}...` : "null");
  
  if (!apiKey) return { ok: false, error: "Missing API key" };

  const record = await db.apiKey.findUnique({
    where: { key: apiKey },
  });

  console.log("[authenticateApiKey] Database record found:", !!record);
  console.log("[authenticateApiKey] Record active:", record?.isActive);

  if (!record) return { ok: false, error: "API key not found" };
  if (!record.isActive) return { ok: false, error: "API key is inactive" };

  const scopes = parseScopes(record.scopes || "");
  console.log("[authenticateApiKey] Required scope:", requiredScope);
  console.log("[authenticateApiKey] Available scopes:", Array.from(scopes));
  
  if (requiredScope && !scopes.has(requiredScope)) {
    return { ok: false, error: "Insufficient scope" };
  }

  console.log("[authenticateApiKey] Authentication successful");
  return { ok: true, branchId: record.branchId, scopes };
}

