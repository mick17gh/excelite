"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICard } from "@/components/dashboard/kpi-card";
import { CategoriesContent } from "@/components/categories/categories-content";
import { InventoryCategoriesContent } from "@/components/inventory/inventory-categories-content";
import { dashboardTabListClass } from "@/components/dashboard/dashboard-theme";
import { Tag, Package, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const menuItemTotal = menuCategories.reduce((sum, cat) => sum + cat.itemCount, 0);
  const activeInventory = inventoryCategories.filter((c) => c.isActive).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Menu Categories" value={menuCategories.length} icon={Tag} />
        <KPICard title="Menu Items" value={menuItemTotal} icon={Package} />
        <KPICard title="Inventory Categories" value={inventoryCategories.length} icon={Layers} />
        <KPICard title="Active Inventory" value={activeInventory} icon={Layers} />
      </div>

      <Tabs defaultValue={initialTab} className="space-y-4">
        <TabsList className={cn(dashboardTabListClass, "w-full sm:w-auto inline-flex h-11")}>
          <TabsTrigger
            value="menu"
            className="rounded-lg px-4 data-[state=active]:bg-[#22C55E] data-[state=active]:text-white"
          >
            Menu categories
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className="rounded-lg px-4 data-[state=active]:bg-[#22C55E] data-[state=active]:text-white"
          >
            Inventory categories
          </TabsTrigger>
        </TabsList>
        <TabsContent value="menu" className="mt-0">
          <CategoriesContent categories={menuCategories} hideStats />
        </TabsContent>
        <TabsContent value="inventory" className="mt-0">
          <InventoryCategoriesContent categories={inventoryCategories} hideStats />
        </TabsContent>
      </Tabs>
    </div>
  );
}
