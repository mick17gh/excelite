"use client";

import { useState, useMemo, useEffect } from "react";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ContentCard } from "@/components/dashboard/content-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UserPlus,
  Shield,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Key,
  UserCheck,
  UserX,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AddUserForm, EditUserForm, ResetPasswordDialog } from "@/components/users/user-forms";
import { TablePagination } from "@/components/ui/table-pagination";
import { authClient } from "@/lib/auth-client";
import { Role } from "@/lib/generated/prisma/client";
import { getRoleShortName, getUserAssignableRoles } from "@/lib/permissions/labels";
import {
  dashboardPrimaryButtonClass,
  dashboardToolbarClass,
  roleBadgeClass,
  stockStatusBadgeClass,
} from "@/components/dashboard/dashboard-theme";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  branchName: string | null;
  isActive: boolean;
  lastLogin: Date;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  warehouseType?: string;
}

interface UsersContentProps {
  users: User[];
  branches: Branch[];
  warehouses: WarehouseOption[];
  currentCount: number;
  maxUsers: number;
}

export function UsersContent({ users, branches, warehouses, currentCount, maxUsers }: UsersContentProps) {
  const { data: session } = authClient.useSession();
  const actorRole = ((session?.user as { role?: Role } | undefined)?.role ?? "STAFF") as Role;
  const filterableRoles = getUserAssignableRoles(actorRole);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] = useState<User | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const adminUsers = users.filter((u) => u.role === "SUPER_ADMIN" || u.role === "ADMIN" || u.role === "EXECUTIVE").length;
  const branchManagers = users.filter((u) => u.role === "BRANCH_MANAGER").length;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Users" value={totalUsers} icon={Users} />
        <KPICard title="Active" value={activeUsers} icon={UserCheck} />
        <KPICard title="Admins" value={adminUsers} icon={Shield} />
        <KPICard title="Managers" value={branchManagers} icon={Users} />
      </div>

      <ContentCard padding="none">
        <div className={dashboardToolbarClass}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-xl pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40 h-10 rounded-xl">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {filterableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleShortName(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36 h-10 rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col items-stretch sm:items-end gap-1 shrink-0">
              <Button
                onClick={() => setIsAddUserOpen(true)}
                className={dashboardPrimaryButtonClass}
                disabled={currentCount >= maxUsers}
                title={currentCount >= maxUsers ? `User limit reached (${currentCount}/${maxUsers}).` : undefined}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {currentCount >= maxUsers ? `Limit reached (${currentCount}/${maxUsers})` : "Add user"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {currentCount} of {maxUsers} seats used
              </p>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id} className="hover:bg-[#22C55E]/5">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 ring-2 ring-[#22C55E]/20">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-[#22C55E]/10 text-[#16A34A] text-sm">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={roleBadgeClass(user.role)}>
                    {getRoleShortName(user.role as Role)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.branchName ? (
                    <Badge variant="outline" className="border-border/80">
                      {user.branchName}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">All branches</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={stockStatusBadgeClass(user.isActive ? "normal" : "critical")}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(user.lastLogin, { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingUser(user)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setResettingPasswordUser(user)}>
                        <Key className="mr-2 h-4 w-4" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        {user.isActive ? (
                          <>
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredUsers.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        )}
      </ContentCard>

      <AddUserForm
        open={isAddUserOpen}
        onOpenChange={setIsAddUserOpen}
        branches={branches}
        warehouses={warehouses}
      />
      <EditUserForm
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        user={editingUser}
        branches={branches}
        warehouses={warehouses}
      />
      <ResetPasswordDialog
        open={!!resettingPasswordUser}
        onOpenChange={(open) => !open && setResettingPasswordUser(null)}
        user={resettingPasswordUser}
      />
    </div>
  );
}
