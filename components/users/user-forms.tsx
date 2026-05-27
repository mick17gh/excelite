"use client";

import { useState, useEffect } from "react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "BRANCH_MANAGER",
    branchId: "",
    assignedWarehouseId: "",
    phone: "",
    isActive: true,
  });

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

  const requiresBranch = ["BRANCH_MANAGER", "SUPERVISOR", "STAFF", "KITCHEN_STAFF", "WAREHOUSE_STAFF", "WAITER"].includes(formData.role);
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
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account with role-based access
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
                  placeholder="kwame.asante@servstack.com"
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
                  <SelectItem value="SUPER_ADMIN">Super Admin (Platform Owner)</SelectItem>
                  <SelectItem value="ADMIN">Admin (Organization Owner)</SelectItem>
                  <SelectItem value="EXECUTIVE">Executive (Strategic Controls)</SelectItem>
                  <SelectItem value="OPERATIONS_MANAGER">Operations Manager</SelectItem>
                  <SelectItem value="BRANCH_MANAGER">Branch Manager</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                  <SelectItem value="STAFF">Staff (POS, KDS, Orders & Customers)</SelectItem>
                  <SelectItem value="WAITER">Waiter (table service POS)</SelectItem>
                  <SelectItem value="KITCHEN_STAFF">Kitchen Staff</SelectItem>
                  <SelectItem value="AUDITOR">Auditor (Read-Only)</SelectItem>
                  <SelectItem value="DEVELOPER">Developer (API Access)</SelectItem>
                  <SelectItem value="CALL_CENTER">Call Center</SelectItem>
                  <SelectItem value="WAREHOUSE_STAFF">Warehouse Staff</SelectItem>
                  <SelectItem value="COMMISSARY_STAFF">Commissary Staff</SelectItem>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    branchId: "",
    assignedWarehouseId: "",
    phone: "",
    isActive: true,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: "",
        assignedWarehouseId: user.assignedWarehouseId || "",
        phone: "",
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

  const requiresBranch = ["BRANCH_MANAGER", "SUPERVISOR", "STAFF", "KITCHEN_STAFF", "WAREHOUSE_STAFF", "WAITER"].includes(formData.role);
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details for {user.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="EXECUTIVE">Executive</SelectItem>
                  <SelectItem value="OPERATIONS_MANAGER">Operations Manager</SelectItem>
                  <SelectItem value="BRANCH_MANAGER">Branch Manager</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="WAITER">Waiter</SelectItem>
                  <SelectItem value="KITCHEN_STAFF">Kitchen Staff</SelectItem>
                  <SelectItem value="AUDITOR">Auditor</SelectItem>
                  <SelectItem value="DEVELOPER">Developer</SelectItem>
                  <SelectItem value="CALL_CENTER">Call Center</SelectItem>
                  <SelectItem value="WAREHOUSE_STAFF">Warehouse Staff</SelectItem>
                  <SelectItem value="COMMISSARY_STAFF">Commissary Staff</SelectItem>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Set a new password for {user.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
