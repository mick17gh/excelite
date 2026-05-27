"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSupplier } from "@/lib/actions/inventory";
import { useCurrency } from "@/contexts/currency-context";
import { CreateSupplierDialog } from "./create-supplier-dialog";
import { EditSupplierDialog } from "./edit-supplier-dialog";
import { SupplierDetailsPanel } from "./supplier-details-panel";
import {
  formatEnumLabel,
  SUPPLIER_LEAD_TIMES,
  SUPPLIER_PAYMENT_METHODS,
} from "./supplier-form-options";

interface SupplierRow {
  id: string;
  name: string;
  code: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  leadTime: string | null;
  consistency: string | null;
  coreCategory: string | null;
  specialization: string | null;
  paymentMethod: string | null;
  qualityRating: string | null;
  specialNotes: string | null;
  tags: string[];
  lifetimePayments: number;
  deliveriesCount: number;
  lastSuppliedAt: string | Date | null;
  isActive: boolean;
}

export function SuppliersContent({ suppliers }: { suppliers: SupplierRow[] }) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [leadTimeFilter, setLeadTimeFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editSupplier, setEditSupplier] = useState<SupplierRow | null>(null);
  const [detailSupplierId, setDetailSupplierId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      if (
        query &&
        !`${s.name} ${s.code} ${s.contactName || ""} ${s.email || ""} ${s.phone || ""}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ) {
        return false;
      }
      if (statusFilter === "active" && !s.isActive) return false;
      if (statusFilter === "inactive" && s.isActive) return false;
      if (leadTimeFilter !== "all" && s.leadTime !== leadTimeFilter) return false;
      if (paymentFilter !== "all" && s.paymentMethod !== paymentFilter) return false;
      return true;
    });
  }, [suppliers, query, statusFilter, leadTimeFilter, paymentFilter]);

  const handleDeactivate = async (supplierId: string) => {
    const result = await deleteSupplier(supplierId);
    if (!result.success) {
      toast.error(result.error || "Failed to deactivate supplier");
      return;
    }
    toast.success("Supplier deactivated");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 flex-1">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search supplier name, code, contact..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={leadTimeFilter} onValueChange={setLeadTimeFilter}>
            <SelectTrigger><SelectValue placeholder="Lead time" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lead times</SelectItem>
              {SUPPLIER_LEAD_TIMES.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Payment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payment types</SelectItem>
              {SUPPLIER_PAYMENT_METHODS.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Lead Time</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Lifetime Value</TableHead>
                <TableHead className="text-center">Deliveries</TableHead>
                <TableHead>Last Supply</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    No suppliers found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        {s.tags?.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {s.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                            ))}
                            {s.tags.length > 2 ? (
                              <Badge variant="outline" className="text-[10px]">+{s.tags.length - 2}</Badge>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{s.code}</TableCell>
                    <TableCell className="text-sm">
                      <p>{s.contactName || "—"}</p>
                      <p className="text-muted-foreground">{s.phone || s.email || "—"}</p>
                    </TableCell>
                    <TableCell>{formatEnumLabel(s.leadTime)}</TableCell>
                    <TableCell>{formatEnumLabel(s.paymentMethod)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(s.lifetimePayments || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{s.deliveriesCount || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      {s.lastSuppliedAt
                        ? new Date(s.lastSuppliedAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          s.isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }
                      >
                        {s.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailSupplierId(s.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditSupplier(s)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeactivate(s.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deactivate
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

      <CreateSupplierDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={() => router.refresh()}
      />
      <EditSupplierDialog
        supplier={editSupplier}
        open={!!editSupplier}
        onOpenChange={(open) => !open && setEditSupplier(null)}
        onUpdated={() => router.refresh()}
      />
      <SupplierDetailsPanel
        supplierId={detailSupplierId}
        open={!!detailSupplierId}
        onOpenChange={(open) => !open && setDetailSupplierId(null)}
      />
    </div>
  );
}
