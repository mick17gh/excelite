import { listInventoryCategories } from "@/lib/actions/inventory-categories";
import { InventoryCategoriesContent } from "@/components/inventory/inventory-categories-content";

export const metadata = {
  title: "Inventory Categories | ServStack",
  description: "Manage inventory category master data",
};

export default async function InventoryCategoriesPage() {
  const result = await listInventoryCategories();
  const categories = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Inventory Categories
        </h1>
        <p className="text-muted-foreground">
          Manage organization-wide inventory and warehouse item categories.
        </p>
      </div>
      <InventoryCategoriesContent categories={categories} />
    </div>
  );
}
