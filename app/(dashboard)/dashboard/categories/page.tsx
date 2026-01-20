import { Suspense } from "react";
import { CategoriesContent } from "@/components/categories/categories-content";
import { getCategories } from "@/lib/actions/categories";

export const metadata = {
  title: "Category Management | Dinelytix",
  description: "Manage menu categories",
};

export default async function CategoriesPage() {
  const categoriesResult = await getCategories();
  const categories = categoriesResult.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Category Management
        </h1>
        <p className="text-muted-foreground">
          Manage menu categories for organizing your menu items
        </p>
      </div>

      <Suspense fallback={<CategoriesLoadingSkeleton />}>
        <CategoriesContent categories={categories} />
      </Suspense>
    </div>
  );
}

function CategoriesLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-96 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
