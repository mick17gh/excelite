"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoriesContent } from "@/components/categories/categories-content";
import { InventoryCategoriesContent } from "@/components/inventory/inventory-categories-content";

interface MenuCategory {
  id: string;
  name: string;
  itemCount: number;
}

interface InventoryCategoryRow {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  sortOrder: number;
  inventoryItemCount: number;
  warehouseItemCount: number;
  totalItemCount: number;
}

interface CategoriesHubContentProps {
  menuCategories: MenuCategory[];
  inventoryCategories: InventoryCategoryRow[];
  showInventoryTab: boolean;
  defaultTab?: "menu" | "inventory";
}

export function CategoriesHubContent({
  menuCategories,
  inventoryCategories,
  showInventoryTab,
  defaultTab = "menu",
}: CategoriesHubContentProps) {
  const initialTab =
    defaultTab === "inventory" && showInventoryTab ? "inventory" : "menu";

  if (!showInventoryTab) {
    return <CategoriesContent categories={menuCategories} />;
  }

  const activeTabClass =
    "data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-500/20 dark:data-[state=active]:from-blue-600 dark:data-[state=active]:to-blue-500 dark:data-[state=active]:text-white";

  return (
    <Tabs defaultValue={initialTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="menu" className={activeTabClass}>
          Menu categories
        </TabsTrigger>
        <TabsTrigger value="inventory" className={activeTabClass}>
          Inventory categories
        </TabsTrigger>
      </TabsList>
      <TabsContent value="menu" className="mt-0">
        <CategoriesContent categories={menuCategories} />
      </TabsContent>
      <TabsContent value="inventory" className="mt-0">
        <InventoryCategoriesContent categories={inventoryCategories} />
      </TabsContent>
    </Tabs>
  );
}
