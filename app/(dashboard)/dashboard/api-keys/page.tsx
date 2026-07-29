import { Suspense } from "react";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { ApiKeysContent } from "@/components/api-keys/api-keys-content";
import { getApiKeys } from "@/lib/actions/api-keys";
import { getBranches } from "@/lib/actions/branches";

export const metadata = {
  title: "API Keys",
  description: "Manage API keys for external integrations",
};

export default function ApiKeysPage() {
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

      <Suspense fallback={<DashboardPageSkeleton kpiCount={0} />}>
        <ApiKeysPageData />
      </Suspense>
    </div>
  );
}

async function ApiKeysPageData() {
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

  return <ApiKeysContent apiKeys={apiKeys} branches={branches} />;
}
