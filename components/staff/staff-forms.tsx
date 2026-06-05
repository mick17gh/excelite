"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { format } from "date-fns";
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { createStaff, updateStaff, scheduleShift, clockIn, clockOut } from "@/lib/actions/staff";
import { staffJobRoleComboboxOptions } from "@/lib/staff/job-role-defaults";
import type { StaffJobRoleCategory } from "@/lib/generated/prisma/client";

interface Branch {
  id: string;
  name: string;
  code: string;
}

export interface StaffJobRoleOption {
  id: string;
  name: string;
  code: string;
  category: StaffJobRoleCategory | null;
}

// Add Staff Form
export interface StaffMemberRecord {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobRoleId: string;
  hourlyRate: number;
  branchId: string;
  hireDate: Date | string;
  isActive: boolean;
  role?: string;
  roleCode?: string;
  dutyStatus?: string;
}

interface AddStaffFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  jobRoles: StaffJobRoleOption[];
  onSuccess?: () => void;
}

export function AddStaffForm({ open, onOpenChange, branches, jobRoles, onSuccess }: AddStaffFormProps) {
  const defaultJobRoleId =
    jobRoles.find((r) => r.code === "SERVICE")?.id ?? jobRoles[0]?.id ?? "";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobRoleId: defaultJobRoleId,
    hourlyRate: "",
    branchId: "",
    hireDate: format(new Date(), "yyyy-MM-dd"),
  });

  const jobRoleOptions = useMemo(
    () => staffJobRoleComboboxOptions(jobRoles, "id"),
    [jobRoles],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.jobRoleId) {
        toast.error("Please select a job role");
        return;
      }

      const result = await createStaff({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        jobRoleId: formData.jobRoleId,
        hourlyRate: parseFloat(formData.hourlyRate),
        branchId: formData.branchId,
        hireDate: new Date(formData.hireDate),
      });

      if (result.success) {
        toast.success("Staff member added successfully");
        onSuccess?.();
        onOpenChange(false);
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          jobRoleId: defaultJobRoleId,
          hourlyRate: "",
          branchId: "",
          hireDate: format(new Date(), "yyyy-MM-dd"),
        });
      } else {
        toast.error(result.error || "Failed to add staff member");
      }
    } catch (error) {
      console.error("Error adding staff:", error);
      toast.error("Failed to add staff member");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
          <DialogDescription>
            Add a new employee to your team
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Kwame"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Mensah"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="kwame.mensah@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+233 20 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="jobRole">Job Role</Label>
                <Combobox
                  options={jobRoleOptions}
                  value={formData.jobRoleId}
                  onValueChange={(value) => setFormData({ ...formData, jobRoleId: value })}
                  placeholder="Search job roles..."
                  searchPlaceholder="Search by role or category..."
                  emptyText="No job roles found."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hourlyRate">Hourly Rate (GH₵)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  placeholder="15.00"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="branch">Branch</Label>
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
              <div className="grid gap-2">
                <Label htmlFor="hireDate">Hire Date</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Staff
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditStaffFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  jobRoles: StaffJobRoleOption[];
  staff: StaffMemberRecord | null;
  onSuccess?: () => void;
}

export function EditStaffForm({
  open,
  onOpenChange,
  branches,
  jobRoles,
  staff,
  onSuccess,
}: EditStaffFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobRoleId: "",
    hourlyRate: "",
    branchId: "",
    hireDate: format(new Date(), "yyyy-MM-dd"),
    isActive: true,
  });

  const jobRoleOptions = useMemo(
    () => staffJobRoleComboboxOptions(jobRoles, "id"),
    [jobRoles],
  );

  useEffect(() => {
    if (!staff || !open) return;
    setFormData({
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email ?? "",
      phone: staff.phone ?? "",
      jobRoleId: staff.jobRoleId,
      hourlyRate: String(staff.hourlyRate),
      branchId: staff.branchId,
      hireDate: format(new Date(staff.hireDate), "yyyy-MM-dd"),
      isActive: staff.isActive,
    });
  }, [staff, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    setIsSubmitting(true);

    try {
      if (!formData.jobRoleId) {
        toast.error("Please select a job role");
        return;
      }

      const result = await updateStaff({
        id: staff.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        jobRoleId: formData.jobRoleId,
        hourlyRate: parseFloat(formData.hourlyRate),
        hireDate: new Date(formData.hireDate),
        branchId: formData.branchId,
        isActive: formData.isActive,
      });

      if (result.success) {
        toast.success("Staff member updated");
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to update staff member");
      }
    } catch (error) {
      console.error("Error updating staff:", error);
      toast.error("Failed to update staff member");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!staff) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
          <DialogDescription>
            Update employee details for {staff.firstName} {staff.lastName} ({staff.employeeId})
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input
                  id="edit-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-jobRole">Job Role</Label>
                <Combobox
                  options={jobRoleOptions}
                  value={formData.jobRoleId}
                  onValueChange={(value) => setFormData({ ...formData, jobRoleId: value })}
                  placeholder="Search job roles..."
                  searchPlaceholder="Search by role or category..."
                  emptyText="No job roles found."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-hourlyRate">Hourly Rate (GH₵)</Label>
                <Input
                  id="edit-hourlyRate"
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-branch">Branch</Label>
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
              <div className="grid gap-2">
                <Label htmlFor="edit-hireDate">Hire Date</Label>
                <Input
                  id="edit-hireDate"
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active employee</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Schedule Shift Form
interface ScheduleShiftFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  staff: Array<{ id: string; name: string; role: string }>;
}

export function ScheduleShiftForm({ open, onOpenChange, branches, staff }: ScheduleShiftFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    staffId: "",
    branchId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    shiftStart: "09:00",
    shiftEnd: "17:00",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dateObj = new Date(formData.date);
      const [startHour, startMin] = formData.shiftStart.split(":").map(Number);
      const [endHour, endMin] = formData.shiftEnd.split(":").map(Number);

      const shiftStart = new Date(dateObj);
      shiftStart.setHours(startHour, startMin, 0, 0);

      const shiftEnd = new Date(dateObj);
      shiftEnd.setHours(endHour, endMin, 0, 0);

      const result = await scheduleShift({
        staffId: formData.staffId,
        branchId: formData.branchId,
        date: dateObj,
        shiftStart,
        shiftEnd,
        notes: formData.notes || undefined,
      });

      if (result.success) {
        toast.success("Shift scheduled successfully");
        onOpenChange(false);
        setFormData({
          staffId: "",
          branchId: "",
          date: format(new Date(), "yyyy-MM-dd"),
          shiftStart: "09:00",
          shiftEnd: "17:00",
          notes: "",
        });
      } else {
        toast.error(result.error || "Failed to schedule shift");
      }
    } catch (error) {
      console.error("Error scheduling shift:", error);
      toast.error("Failed to schedule shift");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule Shift</DialogTitle>
          <DialogDescription>
            Assign a shift to a staff member
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="staff">Staff Member</Label>
              <Select
                value={formData.staffId}
                onValueChange={(value) => setFormData({ ...formData, staffId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} - {s.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="branch">Branch</Label>
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

            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="shiftStart">Start Time</Label>
                <Input
                  id="shiftStart"
                  type="time"
                  value={formData.shiftStart}
                  onChange={(e) => setFormData({ ...formData, shiftStart: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shiftEnd">End Time</Label>
                <Input
                  id="shiftEnd"
                  type="time"
                  value={formData.shiftEnd}
                  onChange={(e) => setFormData({ ...formData, shiftEnd: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule Shift
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Clock In/Out Form
interface ClockFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: Array<{ id: string; name: string; role: string; status: string }>;
  type: "in" | "out";
}

export function ClockInOutForm({ open, onOpenChange, staff, type }: ClockFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [notes, setNotes] = useState("");

  const filteredStaff = type === "in" 
    ? staff.filter(s => s.status === "OFF_DUTY")
    : staff.filter(s => s.status === "ON_DUTY");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = type === "in"
        ? await clockIn(selectedStaff, notes || undefined)
        : await clockOut(selectedStaff, notes || undefined);

      if (result.success) {
        toast.success(`Successfully clocked ${type}`);
        onOpenChange(false);
        setSelectedStaff("");
        setNotes("");
      } else {
        toast.error(result.error || `Failed to clock ${type}`);
      }
    } catch (error) {
      console.error(`Error clocking ${type}:`, error);
      toast.error(`Failed to clock ${type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Clock {type === "in" ? "In" : "Out"}</DialogTitle>
          <DialogDescription>
            Record {type === "in" ? "start" : "end"} of shift
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="staff">Staff Member</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStaff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} - {s.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Current Time</Label>
              <div className="text-2xl font-bold text-primary">
                {format(new Date(), "hh:mm:ss a")}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder={type === "in" ? "Any notes..." : "Tasks completed, handover notes..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedStaff}
              className={type === "in" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Clock {type === "in" ? "In" : "Out"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Leave Request Form
interface LeaveRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: Array<{ id: string; name: string }>;
}

export function LeaveRequestForm({ open, onOpenChange, staff }: LeaveRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    staffId: "",
    leaveType: "VACATION",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success("Leave request submitted successfully");
    setIsSubmitting(false);
    onOpenChange(false);
    setFormData({
      staffId: "",
      leaveType: "VACATION",
      startDate: "",
      endDate: "",
      reason: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Leave</DialogTitle>
          <DialogDescription>
            Submit a leave request for approval
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="staff">Staff Member</Label>
              <Select
                value={formData.staffId}
                onValueChange={(value) => setFormData({ ...formData, staffId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="leaveType">Leave Type</Label>
              <Select
                value={formData.leaveType}
                onValueChange={(value) => setFormData({ ...formData, leaveType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VACATION">Vacation</SelectItem>
                  <SelectItem value="SICK">Sick Leave</SelectItem>
                  <SelectItem value="PERSONAL">Personal Leave</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Reason for leave request..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
