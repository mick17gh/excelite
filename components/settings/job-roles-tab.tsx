"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TablePagination } from "@/components/ui/table-pagination";
import { Briefcase, Edit, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  listStaffJobRoles,
  createStaffJobRole,
  updateStaffJobRole,
  archiveStaffJobRole,
  restoreStaffJobRole,
} from "@/lib/actions/staff-job-roles";
import {
  STAFF_JOB_ROLE_CATEGORY_LABELS,
  SHIFT_TEMPLATE_LABELS,
} from "@/lib/staff/job-role-defaults";
import type { ShiftTemplate, StaffJobRoleCategory } from "@/lib/generated/prisma/client";

interface JobRoleRow {
  id: string;
  name: string;
  code: string;
  category: StaffJobRoleCategory | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  defaultShiftTemplate: ShiftTemplate | null;
  staffCount: number;
}

const CATEGORIES = Object.keys(STAFF_JOB_ROLE_CATEGORY_LABELS) as StaffJobRoleCategory[];
const SHIFT_TEMPLATES = Object.keys(SHIFT_TEMPLATE_LABELS) as ShiftTemplate[];

const emptyForm = {
  name: "",
  code: "",
  category: "" as StaffJobRoleCategory | "",
  description: "",
  sortOrder: "0",
  isActive: true,
  defaultShiftTemplate: "" as ShiftTemplate | "",
};

export function JobRolesTab() {
  const router = useRouter();
  const [roles, setRoles] = useState<JobRoleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<JobRoleRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const loadRoles = async () => {
    setIsLoading(true);
    const res = await listStaffJobRoles();
    if (res.success && res.data) {
      setRoles(res.data as JobRoleRow[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const resetForm = () => setFormData(emptyForm);

  const filteredRoles = roles.filter((row) => {
    if (statusFilter === "active") return row.isActive;
    if (statusFilter === "archived") return !row.isActive;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize));
  const paginatedRoles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRoles.slice(start, start + pageSize);
  }, [filteredRoles, currentPage, pageSize]);

  const archivedCount = roles.filter((r) => !r.isActive).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    setIsSubmitting(true);
    const res = await createStaffJobRole({
      name: formData.name,
      code: formData.code,
      category: formData.category || null,
      description: formData.description || undefined,
      sortOrder: Number(formData.sortOrder || "0"),
      defaultShiftTemplate: formData.defaultShiftTemplate || null,
    });
    setIsSubmitting(false);
    if (!res.success) {
      toast.error(res.error || "Failed to create job role");
      return;
    }
    toast.success("Job role created");
    setIsCreateOpen(false);
    resetForm();
    await loadRoles();
    router.refresh();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setIsSubmitting(true);
    const res = await updateStaffJobRole({
      id: editing.id,
      name: formData.name,
      code: formData.code,
      category: formData.category || null,
      description: formData.description || null,
      sortOrder: Number(formData.sortOrder || "0"),
      isActive: formData.isActive,
      defaultShiftTemplate: formData.defaultShiftTemplate || null,
    });
    setIsSubmitting(false);
    if (!res.success) {
      toast.error(res.error || "Failed to update job role");
      return;
    }
    toast.success("Job role updated");
    setEditing(null);
    resetForm();
    await loadRoles();
    router.refresh();
  };

  const handleArchive = async (row: JobRoleRow) => {
    const res = await archiveStaffJobRole(row.id);
    if (!res.success) {
      toast.error(res.error || "Failed to archive job role");
      return;
    }
    toast.success(row.staffCount > 0 ? "Job role archived" : "Job role deleted");
    await loadRoles();
    router.refresh();
  };

  const handleRestore = async (row: JobRoleRow) => {
    const res = await restoreStaffJobRole(row.id);
    if (!res.success) {
      toast.error(res.error || "Failed to restore job role");
      return;
    }
    toast.success("Job role restored");
    await loadRoles();
    router.refresh();
  };

  const dialogOpen = isCreateOpen || !!editing;

  return (
    <div className="space-y-4">
      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Staff Job Roles
          </CardTitle>
          <CardDescription className="text-xs">
            Define job roles for staff members. Roles appear in Add Staff, scheduling, and CSV import.
            Use the code column in bulk imports.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-3 grid-cols-3">
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Total roles</p>
            <p className="text-base font-bold">{roles.length}</p>
          </CardContent>
        </Card>
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Active</p>
            <p className="text-base font-bold">{roles.length - archivedCount}</p>
          </CardContent>
        </Card>
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Staff assigned</p>
            <p className="text-base font-bold">
              {roles.reduce((s, r) => s + r.staffCount, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Show</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as "all" | "active" | "archived")}
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({roles.length})</SelectItem>
              <SelectItem value="active">Active ({roles.length - archivedCount})</SelectItem>
              <SelectItem value="archived">Archived ({archivedCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Job Role
        </Button>
      </div>

      <Card className="glass">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading job roles...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Shift template</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRoles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No job roles match this filter.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {paginatedRoles.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="font-mono text-xs">{row.code}</TableCell>
                      <TableCell>
                        {row.category
                          ? STAFF_JOB_ROLE_CATEGORY_LABELS[row.category]
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {row.defaultShiftTemplate
                          ? SHIFT_TEMPLATE_LABELS[row.defaultShiftTemplate]
                          : "—"}
                      </TableCell>
                      <TableCell>{row.staffCount}</TableCell>
                      <TableCell>
                        <Badge variant={row.isActive ? "secondary" : "outline"}>
                          {row.isActive ? "Active" : "Archived"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(row);
                              setFormData({
                                name: row.name,
                                code: row.code,
                                category: row.category ?? "",
                                description: row.description ?? "",
                                sortOrder: String(row.sortOrder),
                                isActive: row.isActive,
                                defaultShiftTemplate: row.defaultShiftTemplate ?? "",
                              });
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {row.isActive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchive(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(row)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredRoles.length > 0 && (
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredRoles.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditing(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Job Role" : "Add Job Role"}</DialogTitle>
            <DialogDescription>
              The code is used in CSV imports and must be unique per organization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="jr-name">Name</Label>
              <Input
                id="jr-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Pastry Chef"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jr-code">Code</Label>
              <Input
                id="jr-code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                  })
                }
                placeholder="e.g. PASTRY_CHEF"
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={formData.category || "none"}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      category: v === "none" ? "" : (v as StaffJobRoleCategory),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {STAFF_JOB_ROLE_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Default shift</Label>
                <Select
                  value={formData.defaultShiftTemplate || "none"}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      defaultShiftTemplate: v === "none" ? "" : (v as ShiftTemplate),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {SHIFT_TEMPLATES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {SHIFT_TEMPLATE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jr-sort">Sort order</Label>
              <Input
                id="jr-sort"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jr-desc">Description</Label>
              <Textarea
                id="jr-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label>Active</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditing(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editing ? handleUpdate : handleCreate}
              disabled={isSubmitting}
            >
              {editing ? "Save changes" : "Create role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
