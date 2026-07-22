"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createUser, updateUser, resetUserPassword } from "@/lib/actions/users";
import { Role } from "@/lib/generated/prisma/client";
import { authClient } from "@/lib/auth-client";
import { getRoleFormLabel, getUserAssignableRoles } from "@/lib/permissions/labels";
import {
  dashboardModalHeaderClass,
  dashboardPrimaryButtonClass,
  dashboardSectionCardClass,
} from "@/components/dashboard/dashboard-theme";
import { cn } from "@/lib/utils";

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

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  branchName: string | null;
  assignedWarehouseId?: string | null;
  isActive: boolean;
}

// Add User Form
interface AddUserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  warehouses: WarehouseOption[];
}

export function AddUserForm({ open, onOpenChange, branches, warehouses }: AddUserFormProps) {
  const { data: session } = authClient.useSession();
  const actorRole = ((session?.user as { role?: Role } | undefined)?.role ?? "STAFF") as Role;
  const assignableRoles = getUserAssignableRoles(actorRole);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "BRANCH_MANAGER",
    branchId: "",
    assignedWarehouseId: "",
    phone: "",
    pin: "",
    isActive: true,
  });
  const addPinRefs = useRef<Array<HTMLInputElement | null>>([]);
  const addPinDigits = Array.from({ length: 4 }, (_, idx) => formData.pin[idx] || "");

  const setAddPinAt = (index: number, digit: string) => {
    const next = addPinDigits.slice();
    next[index] = digit;
    setFormData({ ...formData, pin: next.join("") });
  };

  const handleAddPinChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setAddPinAt(index, digit);
    if (digit && index < 3) addPinRefs.current[index + 1]?.focus();
  };

  const handleAddPinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !addPinDigits[index] && index > 0) {
      addPinRefs.current[index - 1]?.focus();
    }
  };

  const handleAddPinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;
    setFormData({ ...formData, pin: pasted });
    addPinRefs.current[Math.min(pasted.length, 4) - 1]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await createUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role as Role,
        branchId: formData.branchId || undefined,
        assignedWarehouseId: formData.assignedWarehouseId || undefined,
        phoneNumber: formData.phone || undefined,
        pin: formData.pin || undefined,
        isActive: formData.isActive,
      });

      if (result.success) {
        toast.success("User created successfully");
        onOpenChange(false);
        setFormData({
          name: "",
          email: "",
          password: "",
          role: "BRANCH_MANAGER",
          branchId: "",
          assignedWarehouseId: "",
          phone: "",
          pin: "",
          isActive: true,
        });
      } else {
        toast.error(result.error || "Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiresBranch = ["BRANCH_MANAGER", "SUPERVISOR", "STAFF", "KITCHEN_STAFF", "WAREHOUSE_STAFF", "WAITER", "SALES"].includes(formData.role);
  const requiresWarehouse = ["WAREHOUSE_STAFF", "COMMISSARY_STAFF"].includes(formData.role);
  const filteredWarehouses = warehouses.filter((w) =>
    formData.role === "COMMISSARY_STAFF"
      ? w.warehouseType === "COMMISSARY"
      : formData.role === "WAREHOUSE_STAFF"
        ? w.warehouseType !== "COMMISSARY"
        : true,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className={cn(dashboardModalHeaderClass, "text-left")}>
          <DialogTitle className="text-white">Add New User</DialogTitle>
          <DialogDescription className="text-white/80">
            Create a new user account with role-based access
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className={cn("grid gap-4 m-6", dashboardSectionCardClass)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Kwame Asante"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="kwame.asante@excelite.app"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Initial Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  User will be prompted to change password on first login
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+233 20 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pin">4-digit PIN (Optional)</Label>
                <div className="flex items-center gap-2">
                  {addPinDigits.map((digit, index) => (
                    <Input
                      key={`add-pin-${index}`}
                      id={index === 0 ? "pin" : undefined}
                      ref={(el) => {
                        addPinRefs.current[index] = el;
                      }}
                      type="password"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className="h-10 w-10 text-center text-base tracking-widest"
                      value={digit}
                      onChange={(e) => handleAddPinChange(index, e.target.value)}
                      onKeyDown={(e) => handleAddPinKeyDown(index, e)}
                      onPaste={handleAddPinPaste}
                      maxLength={1}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Used for PIN-only login</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleFormLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requiresBranch && (
              <div className="grid gap-2">
                <Label htmlFor="branch">Assigned Branch</Label>
                <Select
                  value={formData.branchId}
                  onValueChange={(value) => setFormData({ ...formData, branchId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {requiresWarehouse && (
              <div className="grid gap-2">
                <Label>Assigned warehouse</Label>
                <Select
                  value={formData.assignedWarehouseId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, assignedWarehouseId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredWarehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  User can log in and access the system
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className={dashboardPrimaryButtonClass} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit User Form
interface EditUserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  branches: Branch[];
  warehouses: WarehouseOption[];
}

export function EditUserForm({ open, onOpenChange, user, branches, warehouses }: EditUserFormProps) {
  const { data: session } = authClient.useSession();
  const actorRole = ((session?.user as { role?: Role } | undefined)?.role ?? "STAFF") as Role;
  const assignableRoles = getUserAssignableRoles(actorRole);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    branchId: "",
    assignedWarehouseId: "",
    phone: "",
    pin: "",
    clearPin: false,
    isActive: true,
  });
  const editPinRefs = useRef<Array<HTMLInputElement | null>>([]);
  const editPinDigits = Array.from({ length: 4 }, (_, idx) => formData.pin[idx] || "");

  const setEditPinAt = (index: number, digit: string) => {
    const next = editPinDigits.slice();
    next[index] = digit;
    setFormData({ ...formData, pin: next.join(""), clearPin: false });
  };

  const handleEditPinChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setEditPinAt(index, digit);
    if (digit && index < 3) editPinRefs.current[index + 1]?.focus();
  };

  const handleEditPinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !editPinDigits[index] && index > 0) {
      editPinRefs.current[index - 1]?.focus();
    }
  };

  const handleEditPinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;
    setFormData({ ...formData, pin: pasted, clearPin: false });
    editPinRefs.current[Math.min(pasted.length, 4) - 1]?.focus();
  };

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: "",
        assignedWarehouseId: user.assignedWarehouseId || "",
        phone: "",
        pin: "",
        clearPin: false,
        isActive: user.isActive,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await updateUser({
        id: user!.id,
        name: formData.name,
        email: formData.email,
        role: formData.role as Role,
        branchId: formData.branchId || undefined,
        assignedWarehouseId: formData.assignedWarehouseId || null,
        phoneNumber: formData.phone || undefined,
        pin: formData.pin || undefined,
        clearPin: formData.clearPin,
        isActive: formData.isActive,
      });

      if (result.success) {
        toast.success("User updated successfully");
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const isSuperAdminUser = user.role === "SUPER_ADMIN";
  const canEditRole = actorRole === "SUPER_ADMIN" || !isSuperAdminUser;
  const roleSelectOptions: Role[] = assignableRoles.includes(user.role as Role)
    ? assignableRoles
    : ([...assignableRoles, user.role as Role] as Role[]);

  const requiresBranch = ["BRANCH_MANAGER", "SUPERVISOR", "STAFF", "KITCHEN_STAFF", "WAREHOUSE_STAFF", "WAITER", "SALES"].includes(formData.role);
  const requiresWarehouse = ["WAREHOUSE_STAFF", "COMMISSARY_STAFF"].includes(formData.role);
  const filteredWarehouses = warehouses.filter((w) =>
    formData.role === "COMMISSARY_STAFF"
      ? w.warehouseType === "COMMISSARY"
      : formData.role === "WAREHOUSE_STAFF"
        ? w.warehouseType !== "COMMISSARY"
        : true,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
        <DialogHeader className={cn(dashboardModalHeaderClass, "text-left")}>
          <DialogTitle className="text-white">Edit User</DialogTitle>
          <DialogDescription className="text-white/80">
            Update user details for {user.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className={cn("grid gap-4 m-6", dashboardSectionCardClass)}>
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pin-edit">4-digit PIN (Optional)</Label>
              <div className="flex items-center gap-2">
                {editPinDigits.map((digit, index) => (
                  <Input
                    key={`edit-pin-${index}`}
                    id={index === 0 ? "pin-edit" : undefined}
                    ref={(el) => {
                      editPinRefs.current[index] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="h-10 w-10 text-center text-base tracking-widest"
                    value={digit}
                    onChange={(e) => handleEditPinChange(index, e.target.value)}
                    onKeyDown={(e) => handleEditPinKeyDown(index, e)}
                    onPaste={handleEditPinPaste}
                    maxLength={1}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Leave all boxes empty to keep current PIN</p>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.clearPin}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, clearPin: checked, pin: checked ? "" : formData.pin })
                  }
                />
                <p className="text-xs text-muted-foreground">Clear existing PIN</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              {canEditRole ? (
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleSelectOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {getRoleFormLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground rounded-md border px-3 py-2">
                  {getRoleFormLabel(user.role as Role)} — only Super Admin can change this role
                </p>
              )}
            </div>

            {requiresBranch && (
              <div className="grid gap-2">
                <Label htmlFor="branch">Assigned Branch</Label>
                <Select
                  value={formData.branchId}
                  onValueChange={(value) => setFormData({ ...formData, branchId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {requiresWarehouse && (
              <div className="grid gap-2">
                <Label>Assigned warehouse</Label>
                <Select
                  value={formData.assignedWarehouseId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, assignedWarehouseId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredWarehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  User can log in and access the system
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className={dashboardPrimaryButtonClass} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Reset Password Dialog
interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function ResetPasswordDialog({ open, onOpenChange, user }: ResetPasswordDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!open) {
      setFormData({ newPassword: "", confirmPassword: "" });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetUserPassword(user!.id, formData.newPassword);

      if (result.success) {
        toast.success("Password reset successfully");
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to reset password");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden">
        <DialogHeader className={cn(dashboardModalHeaderClass, "text-left")}>
          <DialogTitle className="text-white">Reset Password</DialogTitle>
          <DialogDescription className="text-white/80">
            Set a new password for {user.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className={cn("grid gap-4 m-6", dashboardSectionCardClass)}>
            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className={dashboardPrimaryButtonClass} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
