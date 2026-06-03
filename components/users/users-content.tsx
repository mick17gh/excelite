"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  
  // Pagination state
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  // Paginated users
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const adminUsers = users.filter((u) => u.role === "SUPER_ADMIN" || u.role === "ADMIN" || u.role === "EXECUTIVE").length;
  const branchManagers = users.filter((u) => u.role === "BRANCH_MANAGER").length;

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      SUPER_ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      ADMIN: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
      EXECUTIVE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      OPERATIONS_MANAGER: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
      BRANCH_MANAGER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      SUPERVISOR: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
      STAFF: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
      WAITER: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
      KITCHEN_STAFF: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      AUDITOR: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      DEVELOPER: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
      CALL_CENTER: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
      WAREHOUSE_STAFF: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
      COMMISSARY_STAFF: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
      PROCUREMENT: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
      SALES: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
      ACCOUNTS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      GENERIC: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
    };
    return (
      <Badge className={colors[role] || "bg-slate-100 text-slate-700"}>
        {getRoleShortName(role as Role)}
      </Badge>
    );
  };

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
      {/* Summary Cards - Compact */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Total Users</p>
                <p className="text-base font-bold mt-0.5">{totalUsers}</p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <Users className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Active</p>
                <p className="text-base font-bold mt-0.5 text-emerald-600">{activeUsers}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
                <UserCheck className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Admins</p>
                <p className="text-base font-bold mt-0.5">{adminUsers}</p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <Shield className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Managers</p>
                <p className="text-base font-bold mt-0.5">{branchManagers}</p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <Users className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-40">
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
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => setIsAddUserOpen(true)}
          size="sm"
          className="h-8"
          disabled={currentCount >= maxUsers}
          title={currentCount >= maxUsers ? `User limit reached (${currentCount}/${maxUsers}). Upgrade your plan.` : undefined}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {currentCount >= maxUsers ? `Limit Reached (${currentCount}/${maxUsers})` : "Add User"}
        </Button>
      </div>

      {/* Users Table */}
      <Card className="glass">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    {user.branchName ? (
                      <Badge variant="secondary">{user.branchName}</Badge>
                    ) : (
                      <span className="text-muted-foreground">All Branches</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(user.lastLogin, { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
        </CardContent>
      </Card>

      {/* Forms */}
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
