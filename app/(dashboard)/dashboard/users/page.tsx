import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPageSkeleton } from "@/components/dashboard/page-loading-skeleton";
import { UsersContent } from "@/components/users/users-content";
import { getBranches } from "@/lib/actions/branches";
import { getUsers } from "@/lib/actions/users";
import { getOrganization } from "@/lib/actions/organization";
import { getWarehouses } from "@/lib/actions/warehouse";

export const metadata = {
  title: "User Management",
  description: "Manage system users and access permissions",
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage system users, roles, and access permissions"
      />
      <Suspense fallback={<DashboardPageSkeleton kpiCount={4} />}>
        <UsersPageData />
      </Suspense>
    </div>
  );
}

async function UsersPageData() {
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

  const branchList = (branchesResult.data || []).map((branch) => {
    const { taxRate, ...rest } = branch;
    return {
      ...rest,
      taxRate: taxRate ? Number(taxRate) : 0,
    };
  });
  const rawUsers = usersResult.data || [];
  const users = rawUsers.map(
    (user: {
      id: string;
      name: string;
      email: string;
      role: string;
      branchName?: string | null;
      assignedWarehouseId?: string | null;
      isActive: boolean;
      createdAt: Date;
    }) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchName: user.branchName || null,
      assignedWarehouseId: user.assignedWarehouseId || null,
      isActive: user.isActive,
      lastLogin: user.createdAt,
    }),
  );

  return (
    <UsersContent
      users={users}
      branches={branchList}
      warehouses={warehouseList}
      currentCount={orgResult.data?.userCount || 0}
      maxUsers={orgResult.data?.maxUsers || 2}
    />
  );
}
