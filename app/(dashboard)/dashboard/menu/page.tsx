import { Suspense } from "react";
import { MenuContent } from "@/components/menu/menu-content";
import { getMenuItems, getMenuCategories } from "@/lib/actions/menu";
import { getBranches } from "@/lib/actions/branches";

export const metadata = {
  title: "Products | ServStack",
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
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Products
        </h1>
        <p className="text-muted-foreground">
          Create and manage your restaurant menu items and products
        </p>
      </div>

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
