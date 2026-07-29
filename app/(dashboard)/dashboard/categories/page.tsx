import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { CategoriesHubContent } from "@/components/categories/categories-hub-content";
import { getCategories } from "@/lib/actions/categories";
import { listInventoryCategories } from "@/lib/actions/inventory-categories";
import { requireSessionAccess } from "@/lib/permissions/load-session-access";
import { hasPermissionInList } from "@/lib/permissions/resolver";

export const metadata = {
  title: "Category Management",
  description: "Manage menu and inventory categories",
};

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const defaultTab: "menu" | "inventory" =
    tab === "inventory" ? "inventory" : "menu";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage menu categories and organization-wide inventory category master data"
      />
      <Suspense fallback={<DashboardPageSkeleton kpiCount={0} />}>
        <CategoriesPageData defaultTab={defaultTab} />
      </Suspense>
    </div>
  );
}

async function CategoriesPageData({
  defaultTab,
}: {
  defaultTab: "menu" | "inventory";
}) {
  const access = await requireSessionAccess();
  const showInventoryTab = hasPermissionInList(access.permissions, "categories:manage");

  const [categoriesResult, inventoryResult] = await Promise.all([
    getCategories(),
    showInventoryTab ? listInventoryCategories() : Promise.resolve(null),
  ]);

  const menuCategories = categoriesResult.data || [];
  const inventoryCategories =
    inventoryResult?.success && inventoryResult.data ? inventoryResult.data : [];

  return (
    <CategoriesHubContent
      menuCategories={menuCategories}
      inventoryCategories={inventoryCategories}
      showInventoryTab={showInventoryTab}
      defaultTab={defaultTab}
    />
  );
}
