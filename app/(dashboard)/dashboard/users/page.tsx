import { Suspense } from "react";
import { UsersContent } from "@/components/users/users-content";
import { getBranches } from "@/lib/actions/branches";
import { getUsers } from "@/lib/actions/users";

export const metadata = {
  title: "User Management | Dinelytix",
  description: "Manage system users and access permissions",
};

export default async function UsersPage() {
  const [branchesResult, usersResult] = await Promise.all([
    getBranches(),
    getUsers(),
  ]);

  const branchList = branchesResult.data || [];
  const rawUsers = usersResult.data || [];
  const users = rawUsers.map((user: { id: string; name: string; email: string; role: string; branchName?: string | null; isActive: boolean; createdAt: Date }) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branchName: user.branchName || null,
    isActive: user.isActive,
    lastLogin: user.createdAt,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          User Management
        </h1>
        <p className="text-muted-foreground">
          Manage system users, roles, and access permissions
        </p>
      </div>

      <Suspense fallback={<UsersLoadingSkeleton />}>
        <UsersContent users={users} branches={branchList} />
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
