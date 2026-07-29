import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { MenuContent } from "@/components/menu/menu-content";
import { getMenuItems, getMenuCategories } from "@/lib/actions/menu";
import { getBranches } from "@/lib/actions/branches";

export const metadata = {
  title: "Products",
  description: "Manage your restaurant menu items and products",
};

export default function MenuPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Create and manage your restaurant menu items and products"
      />
      <Suspense fallback={<DashboardPageSkeleton kpiCount={4} />}>
        <MenuPageData />
      </Suspense>
    </div>
  );
}

async function MenuPageData() {
  const [itemsResult, categoriesResult, branchesResult] = await Promise.all([
    getMenuItems(undefined, true),
    getMenuCategories(),
    getBranches(),
  ]);

  const items = itemsResult.data || [];
  const categories = categoriesResult.data || [];
  const branches = (branchesResult.data || [])
    .filter((b) => b.isActive)
    .map((b) => ({ id: b.id, name: b.name, code: b.code }));

  return <MenuContent items={items} categories={categories} branches={branches} />;
}
