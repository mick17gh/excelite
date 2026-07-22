import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { MenuContent } from "@/components/menu/menu-content";
import { getMenuItems, getMenuCategories } from "@/lib/actions/menu";
import { getBranches } from "@/lib/actions/branches";

export const metadata = {
  title: "Products",
  description: "Manage your restaurant menu items and products",
};

export default async function MenuPage() {
  const [itemsResult, categoriesResult, branchesResult] = await Promise.all([
    getMenuItems(undefined, true), // Include inactive items to debug
    getMenuCategories(),
    getBranches(),
  ]);

  const items = itemsResult.data || [];
  const categories = categoriesResult.data || [];
  const branches = (branchesResult.data || [])
    .filter((b) => b.isActive)
    .map((b) => ({ id: b.id, name: b.name, code: b.code }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Create and manage your restaurant menu items and products"
      />

      <Suspense fallback={<MenuLoadingSkeleton />}>
        <MenuContent items={items} categories={categories} branches={branches} />
      </Suspense>
    </div>
  );
}

function MenuLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
