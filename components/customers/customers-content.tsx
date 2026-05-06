"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Contact,
  Users,
  UserPlus,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { deleteCustomer } from "@/lib/actions/customers";
import { CreateCustomerDialog, EditCustomerDialog } from "./customer-forms";
import { CustomerDetailModal } from "./customer-detail-modal";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  location?: string | null;
  customerVibe?: string | null;
  specialNotes?: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  orderCount: number;
  lifetimeValue?: number;
  createdAt: string;
}

interface CustomerStats {
  total: number;
  active: number;
  newThisMonth: number;
}

interface CustomersContentProps {
  customers: Customer[];
  stats: CustomerStats;
}

export function CustomersContent({ customers, stats }: CustomersContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        (c.location || c.city)?.toLowerCase().includes(q)
      );
    });
  }, [customers, searchQuery]);

  const handleDelete = async (id: string) => {
    const result = await deleteCustomer(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Customer deactivated");
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-2 sm:gap-3 grid-cols-3">
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Total Customers</p>
                <p className="text-base font-bold mt-0.5">{stats.total}</p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <Contact className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Active</p>
                <p className="text-base font-bold mt-0.5 text-emerald-600">{stats.active}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">New This Month</p>
                <p className="text-base font-bold mt-0.5 text-blue-600">{stats.newThisMonth}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-blue-100 dark:bg-blue-900/30">
                <UserPlus className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Customers Table */}
      <Card className="rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Vibe</TableHead>
                <TableHead className="text-right">Lifetime Value</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedCustomer(customer)}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="font-mono text-sm">{customer.phone}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{customer.email || "—"}</TableCell>
                    <TableCell className="text-sm">{customer.location || customer.city || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {customer.customerVibe ? (
                        <Badge variant="outline">{customer.customerVibe.replace("_", " ")}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {(customer.lifetimeValue || 0).toLocaleString(undefined, { style: "currency", currency: "GHS" })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{customer.orderCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={customer.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}>
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(customer.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); }}>
                            <Eye className="mr-2 h-4 w-4" />View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditCustomer(customer); }}>
                            <Edit className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(customer.id); }}>
                            <Trash2 className="mr-2 h-4 w-4" />Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateCustomerDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      {editCustomer && (
        <EditCustomerDialog customer={editCustomer} open={!!editCustomer} onOpenChange={(open) => !open && setEditCustomer(null)} />
      )}
      {selectedCustomer && (
        <CustomerDetailModal customer={selectedCustomer} open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)} />
      )}
    </div>
  );
}
