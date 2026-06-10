"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditBranchForm } from "./branch-forms";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Package,
  Users,
  TrendingUp,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TablePagination } from "@/components/ui/table-pagination";
import { BranchPaystackPanel } from "@/components/branches/branch-paystack-panel";
import type { BranchScalarsForClient } from "@/lib/branches/serialize-client";

function useTabPagination<T>(items: T[], defaultPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return {
    page,
    pageSize,
    totalPages,
    paginatedItems,
    setPage,
    handlePageSizeChange,
  };
}

type Branch = BranchScalarsForClient;

interface Transaction {
  id: string;
  transactionRef: string;
  amount: number;
  paymentMethod: string;
  transactionDate: Date;
}

interface Sale {
  id: string;
  saleNumber: string;
  total: number;
  subtotal: number;
  tax: number;
  channel: string;
  dayPart: string;
  saleDate: Date;
}

interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  unitCost: number;
  status: string;
}

interface StaffMember {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status?: string;
  dutyStatus?: string;
}

interface Target {
  id: string;
  targetType: string;
  period: string;
  targetValue: number;
  currentValue: number;
  periodStart: Date | string;
  periodEnd: Date | string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string | null;
  branchName: string | null;
  isActive: boolean;
  createdAt: Date | string;
}

interface BranchDetailsContentProps {
  branch: Branch;
  transactions: Transaction[];
  sales: Sale[];
  inventory: InventoryItem[];
  staff: StaffMember[];
  users: User[];
  targets: Target[];
  tableManagementEnabled?: boolean;
  orgTableManagementEnabled?: boolean;
  paystackEnabled?: boolean;
}

export function BranchDetailsContent({
  branch,
  transactions,
  sales,
  inventory,
  staff,
  users,
  targets,
  tableManagementEnabled = false,
  orgTableManagementEnabled = false,
  paystackEnabled = false,
}: BranchDetailsContentProps) {
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const transactionsPagination = useTabPagination(transactions);
  const inventoryPagination = useTabPagination(inventory);
  const staffPagination = useTabPagination(staff);
  const usersPagination = useTabPagination(users);
  const targetsPagination = useTabPagination(targets);

  // Use sales data for accurate revenue (includes manual POS entries)
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalInventoryValue = inventory.reduce(
    (sum, item) => sum + Number(item.currentStock) * Number(item.unitCost),
    0
  );
  const activeStaff = staff.filter((s) => s.dutyStatus === "ON_DUTY").length;
  const activeTargets = targets.filter((t) => Number(t.currentValue) > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/branches">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">
              {branch.name}
            </h1>
            <p className="text-muted-foreground">Branch Code: {branch.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={branch.isActive ? "default" : "secondary"}>
            {branch.isActive ? (
              <>
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Active
              </>
            ) : (
              <>
                <XCircle className="mr-1 h-3 w-3" />
                Inactive
              </>
            )}
          </Badge>
          {tableManagementEnabled && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/branches/${branch.id}/tables`}>Manage tables</Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            Edit Branch
          </Button>
        </div>
      </div>

      {/* Branch Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Inventory Value</p>
                <p className="text-lg font-bold">{formatCurrency(totalInventoryValue)}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Staff</p>
                <p className="text-lg font-bold">{activeStaff}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Targets</p>
                <p className="text-lg font-bold">{activeTargets}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BranchPaystackPanel
        branchId={branch.id}
        branchName={branch.name}
        paystackEnabled={paystackEnabled}
        paystackSubaccountCode={branch.paystackSubaccountCode}
        paystackSubaccountActive={branch.paystackSubaccountActive}
        paystackSubaccountSource={branch.paystackSubaccountSource}
        settlementAccountName={branch.settlementAccountName}
        settlementAccountNumber={branch.settlementAccountNumber}
      />

      {/* Branch Details */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Information</CardTitle>
          <CardDescription>Contact and location details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">
                  {branch.address || "Not specified"}
                </p>
                <p className="text-sm text-muted-foreground">{branch.city}</p>
              </div>
            </div>
            {branch.phoneNumber && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{branch.phoneNumber}</p>
                </div>
              </div>
            )}
            {branch.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{branch.email}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(branch.createdAt), "MMM dd, yyyy")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="targets">Targets</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Latest transactions for this branch
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No transactions found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsPagination.paginatedItems.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {transaction.transactionRef}
                        </TableCell>
                        <TableCell>{formatCurrency(Number(transaction.amount))}</TableCell>
                        <TableCell>{transaction.paymentMethod}</TableCell>
                        <TableCell>
                          {format(new Date(transaction.transactionDate), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {transactions.length > 0 && (
                <TablePagination
                  currentPage={transactionsPagination.page}
                  totalPages={transactionsPagination.totalPages}
                  totalItems={transactions.length}
                  pageSize={transactionsPagination.pageSize}
                  onPageChange={transactionsPagination.setPage}
                  onPageSizeChange={transactionsPagination.handlePageSizeChange}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>Current stock levels</CardDescription>
            </CardHeader>
            <CardContent>
              {inventory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No inventory items found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryPagination.paginatedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{Number(item.currentStock).toLocaleString()}</TableCell>
                        <TableCell>{formatCurrency(Number(item.unitCost))}</TableCell>
                        <TableCell>
                          {formatCurrency(Number(item.currentStock) * Number(item.unitCost))}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === "IN_STOCK"
                                ? "default"
                                : item.status === "LOW_STOCK"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {inventory.length > 0 && (
                <TablePagination
                  currentPage={inventoryPagination.page}
                  totalPages={inventoryPagination.totalPages}
                  totalItems={inventory.length}
                  pageSize={inventoryPagination.pageSize}
                  onPageChange={inventoryPagination.setPage}
                  onPageSizeChange={inventoryPagination.handlePageSizeChange}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Members</CardTitle>
              <CardDescription>Current staff assignments</CardDescription>
            </CardHeader>
            <CardContent>
              {staff.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No staff members found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffPagination.paginatedItems.map((member: StaffMember) => {
                      const name = member.name || `${member.firstName || ""} ${member.lastName || ""}`.trim();
                      const status = member.status || member.dutyStatus || "UNKNOWN";
                      return (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{name || "Unknown"}</TableCell>
                          <TableCell>{member.role}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                status === "ON_DUTY" ? "default" : "secondary"
                              }
                            >
                              {status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {staff.length > 0 && (
                <TablePagination
                  currentPage={staffPagination.page}
                  totalPages={staffPagination.totalPages}
                  totalItems={staff.length}
                  pageSize={staffPagination.pageSize}
                  onPageChange={staffPagination.setPage}
                  onPageSizeChange={staffPagination.handlePageSizeChange}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Users</CardTitle>
              <CardDescription>Users with access to this branch</CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No users assigned to this branch</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersPagination.paginatedItems.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.role.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.isActive ? "default" : "secondary"}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(user.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {users.length > 0 && (
                <TablePagination
                  currentPage={usersPagination.page}
                  totalPages={usersPagination.totalPages}
                  totalItems={users.length}
                  pageSize={usersPagination.pageSize}
                  onPageChange={usersPagination.setPage}
                  onPageSizeChange={usersPagination.handlePageSizeChange}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Targets</CardTitle>
              <CardDescription>Branch KPI targets and progress</CardDescription>
            </CardHeader>
            <CardContent>
              {targets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No targets set</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targetsPagination.paginatedItems.map((target) => {
                      const progress = target.targetValue > 0
                        ? (target.currentValue / target.targetValue) * 100
                        : 0;
                      return (
                        <TableRow key={target.id}>
                          <TableCell className="font-medium">{target.targetType}</TableCell>
                          <TableCell>{target.period}</TableCell>
                          <TableCell>{formatCurrency(target.targetValue)}</TableCell>
                          <TableCell>{formatCurrency(target.currentValue)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground w-12 text-right">
                                {progress.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {targets.length > 0 && (
                <TablePagination
                  currentPage={targetsPagination.page}
                  totalPages={targetsPagination.totalPages}
                  totalItems={targets.length}
                  pageSize={targetsPagination.pageSize}
                  onPageChange={targetsPagination.setPage}
                  onPageSizeChange={targetsPagination.handlePageSizeChange}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Branch Form */}
      <EditBranchForm
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        orgTableManagementEnabled={orgTableManagementEnabled}
        branch={branch}
      />
    </div>
  );
}
