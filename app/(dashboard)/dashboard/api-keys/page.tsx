import { Suspense } from "react";
import { ApiKeysContent } from "@/components/api-keys/api-keys-content";
import { getApiKeys } from "@/lib/actions/api-keys";
import { getBranches } from "@/lib/actions/branches";

export const metadata = {
  title: "API Keys | Dinelytix",
  description: "Manage API keys for external integrations",
};

export default async function ApiKeysPage() {
  const [apiKeysResult, branchesResult] = await Promise.all([
    getApiKeys(),
    getBranches(),
  ]);

  const apiKeys = apiKeysResult.data || [];
  const branches = (branchesResult.data || []).map((branch: any) => {
    const { taxRate, ...rest } = branch;
    return {
      ...rest,
      taxRate: taxRate ? Number(taxRate) : 0,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          API Key Management
        </h1>
        <p className="text-muted-foreground">
          Create and manage API keys for third-party integrations and external access
        </p>
      </div>

      <Suspense fallback={<ApiKeysLoadingSkeleton />}>
        <ApiKeysContent apiKeys={apiKeys} branches={branches} />
      </Suspense>
    </div>
  );
}

function ApiKeysLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-96 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
