import { Suspense } from "react";
import { MenuContent } from "@/components/menu/menu-content";
import { getMenuItems, getMenuCategories } from "@/lib/actions/menu";

export const metadata = {
  title: "Menu Management | Dinelytix",
  description: "Manage your restaurant menu items and products",
};

export default async function MenuPage() {
  const [itemsResult, categoriesResult] = await Promise.all([
    getMenuItems(),
    getMenuCategories(),
  ]);

  const items = itemsResult.data || [];
  const categories = categoriesResult.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Menu Management
        </h1>
        <p className="text-muted-foreground">
          Create and manage your restaurant menu items and products
        </p>
      </div>

      <Suspense fallback={<MenuLoadingSkeleton />}>
        <MenuContent items={items} categories={categories} />
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
