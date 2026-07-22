import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { headers } from "next/headers";
import { CategoriesHubContent } from "@/components/categories/categories-hub-content";
import { getCategories } from "@/lib/actions/categories";
import { listInventoryCategories } from "@/lib/actions/inventory-categories";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEffectivePermissions, hasPermissionInList } from "@/lib/permissions/resolver";
import type { Role } from "@/lib/generated/prisma/client";

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
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user?.role as Role) || "STAFF";
  const org = await db.organization.findFirst({ select: { id: true } });
  const permissions = org
    ? await getEffectivePermissions(org.id, role)
    : [];
  const showInventoryTab = hasPermissionInList(permissions, "categories:manage");

  const [categoriesResult, inventoryResult] = await Promise.all([
    getCategories(),
    showInventoryTab ? listInventoryCategories() : Promise.resolve(null),
  ]);

  const menuCategories = categoriesResult.data || [];
  const inventoryCategories =
    inventoryResult?.success && inventoryResult.data ? inventoryResult.data : [];

  const defaultTab = tab === "inventory" ? "inventory" : "menu";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage menu categories and organization-wide inventory category master data"
      />

      <Suspense fallback={<CategoriesLoadingSkeleton />}>
        <CategoriesHubContent
          menuCategories={menuCategories}
          inventoryCategories={inventoryCategories}
          showInventoryTab={showInventoryTab}
          defaultTab={defaultTab}
        />
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
