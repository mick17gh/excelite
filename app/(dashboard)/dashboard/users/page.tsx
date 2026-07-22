import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { UsersContent } from "@/components/users/users-content";
import { getBranches } from "@/lib/actions/branches";
import { getUsers } from "@/lib/actions/users";
import { getOrganization } from "@/lib/actions/organization";
import { getWarehouses } from "@/lib/actions/warehouse";

export const metadata = {
  title: "User Management",
  description: "Manage system users and access permissions",
};

export default async function UsersPage() {
  const [branchesResult, usersResult, orgResult, warehousesResult] = await Promise.all([
    getBranches(),
    getUsers(),
    getOrganization(),
    getWarehouses(),
  ]);
  const warehouseList = (warehousesResult.data || []).map((w) => ({
    id: w.id,
    name: w.name,
    code: w.code,
    warehouseType: w.warehouseType,
  }));

  const branchList = (branchesResult.data || []).map((branch: any) => {
    const { taxRate, ...rest } = branch;
    return {
      ...rest,
      taxRate: taxRate ? Number(taxRate) : 0,
    };
  });
  const rawUsers = usersResult.data || [];
  const users = rawUsers.map((user: { id: string; name: string; email: string; role: string; branchName?: string | null; assignedWarehouseId?: string | null; isActive: boolean; createdAt: Date }) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branchName: user.branchName || null,
    assignedWarehouseId: user.assignedWarehouseId || null,
    isActive: user.isActive,
    lastLogin: user.createdAt,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage system users, roles, and access permissions"
      />

      <Suspense fallback={<UsersLoadingSkeleton />}>
        <UsersContent users={users} branches={branchList} warehouses={warehouseList} currentCount={orgResult.data?.userCount || 0} maxUsers={orgResult.data?.maxUsers || 2} />
      </Suspense>
    </div>
  );
}

function UsersLoadingSkeleton() {
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
