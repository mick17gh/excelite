"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  Loader2,
  CalendarDays,
  DollarSign,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { scheduleShift, clockIn, clockOut, getWeeklySchedule, getTimesheetData } from "@/lib/actions/staff";
import { AddStaffForm } from "./staff-forms";
import { BulkImportDialog } from "@/components/bulk-import-dialog";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";

interface StaffSummary {
  branchId: string;
  branchName: string;
  totalStaff: number;
  onDuty: number;
  required: number;
  status: "adequate" | "understaffed" | "overstaffed";
}

interface StaffMember {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  branchName: string;
  shiftStart: string;
  shiftEnd: string;
  status: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  requiredStaff?: number;
}

interface WeeklySchedule {
  [dateKey: string]: Array<{
    id: string;
    staffId: string;
    branchId: string;
    scheduledDate: Date;
    shiftStart: Date;
    shiftEnd: Date;
    staff: {
      id: string;
      employeeId: string;
      firstName: string;
      lastName: string;
      role: string;
    };
  }>;
}

interface TimesheetEntry {
  staff: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    role: string;
    hourlyRate: number;
  };
  branch: { id: string; name: string } | null;
  totalHours: number;
  estimatedPay: number;
}

interface StaffContentProps {
  summary: StaffSummary[];
  schedule: StaffMember[];
  branches: Branch[];
  allStaff?: Array<{
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    role: string;
    branchId: string;
    dutyStatus: string;
  }>;
}

export function StaffContent({ summary, schedule, branches, allStaff = [] }: StaffContentProps) {
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  
  // Schedule dialog state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    staffId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    shiftStart: "09:00",
    shiftEnd: "17:00",
    shiftTemplate: "",
    selectedStaff: [] as string[],
  });
  
  // Weekly schedule state
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});
  const [selectedBranchForWeek, setSelectedBranchForWeek] = useState<string>("");
  const [loadingWeek, setLoadingWeek] = useState(false);
  
  // Timesheet state
  const [timesheetData, setTimesheetData] = useState<TimesheetEntry[]>([]);
  const [loadingTimesheet, setLoadingTimesheet] = useState(false);
  
  // Clock in/out loading state
  const [clockingStaffId, setClockingStaffId] = useState<string | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isAutoFillOpen, setIsAutoFillOpen] = useState(false);
  const [autoFillDate, setAutoFillDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Predefined shift templates
  const shiftTemplates = {
    morning: { start: "06:00", end: "14:00", label: "Morning (6 AM - 2 PM)" },
    evening: { start: "14:00", end: "22:00", label: "Evening (2 PM - 10 PM)" },
    night: { start: "22:00", end: "06:00", label: "Night (10 PM - 6 AM)" },
    full: { start: "09:00", end: "17:00", label: "Full Day (9 AM - 5 PM)" },
  };
  
  // Add staff dialog state
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const totalStaff = summary.reduce((sum, s) => sum + s.totalStaff, 0);
  const totalOnDuty = summary.reduce((sum, s) => sum + s.onDuty, 0);
  // const totalRequired = summary.reduce((sum, s) => sum + s.required, 0);
  const understaffedBranches = summary.filter((s) => s.status === "understaffed").length;

  const filteredSchedule = schedule.filter((staff) => {
    const matchesBranch = branchFilter === "all" || 
      branches.find((b) => b.name === staff.branchName)?.id === branchFilter;
    const matchesStatus = statusFilter === "all" || staff.status === statusFilter;
    return matchesBranch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ON_DUTY":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            On Duty
          </Badge>
        );
      case "OFF_DUTY":
        return (
          <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
            Off Duty
          </Badge>
        );
      case "ON_LEAVE":
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            On Leave
          </Badge>
        );
      case "SICK":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Sick
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBranchStatusBadge = (status: string) => {
    switch (status) {
      case "adequate":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Adequate
          </Badge>
        );
      case "understaffed":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <AlertCircle className="mr-1 h-3 w-3" />
            Understaffed
          </Badge>
        );
      case "overstaffed":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Overstaffed
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      MANAGER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      KITCHEN: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      SERVICE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      CASHIER: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      DELIVERY: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    };
    return <Badge className={colors[role] || "bg-slate-100 text-slate-700"}>{role}</Badge>;
  };

  // Handle shift template selection
  const handleShiftTemplateChange = (template: string) => {
    if (template && shiftTemplates[template as keyof typeof shiftTemplates]) {
      const selectedTemplate = shiftTemplates[template as keyof typeof shiftTemplates];
      setScheduleForm(prev => ({
        ...prev,
        shiftTemplate: template,
        shiftStart: selectedTemplate.start,
        shiftEnd: selectedTemplate.end,
      }));
    }
  };

  // Handle bulk staff selection
  const handleStaffSelection = (staffId: string, checked: boolean) => {
    setScheduleForm(prev => ({
      ...prev,
      selectedStaff: checked 
        ? [...prev.selectedStaff, staffId]
        : prev.selectedStaff.filter(id => id !== staffId)
    }));
  };

  // Handlers
  const handleAddSchedule = async () => {
    const staffToSchedule = isBulkMode ? scheduleForm.selectedStaff : [scheduleForm.staffId];
    
    if (staffToSchedule.length === 0 || !scheduleForm.date) {
      toast.error("Please select staff and fill in all required fields");
      return;
    }

    const dateObj = new Date(scheduleForm.date);
    const [startHour, startMin] = scheduleForm.shiftStart.split(":").map(Number);
    const [endHour, endMin] = scheduleForm.shiftEnd.split(":").map(Number);

    const shiftStart = new Date(dateObj);
    shiftStart.setHours(startHour, startMin, 0, 0);

    const shiftEnd = new Date(dateObj);
    shiftEnd.setHours(endHour, endMin, 0, 0);

    startTransition(async () => {
      let successCount = 0;
      let errorCount = 0;

      for (const staffId of staffToSchedule) {
        // Find the staff member to get their branch
        const selectedStaff = allStaff.find(staff => staff.id === staffId);
        if (!selectedStaff) {
          errorCount++;
          continue;
        }

        const result = await scheduleShift({
          staffId,
          branchId: selectedStaff.branchId,
          date: dateObj,
          shiftStart,
          shiftEnd,
        });

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} shift(s) scheduled successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
        setIsScheduleOpen(false);
        setScheduleForm({
          staffId: "",
          date: format(new Date(), "yyyy-MM-dd"),
          shiftStart: "09:00",
          shiftEnd: "17:00",
          shiftTemplate: "",
          selectedStaff: [],
        });
        setIsBulkMode(false);
      } else {
        toast.error("Failed to schedule shifts");
      }
    });
  };

  // Copy previous week's schedule
  const handleCopyPreviousWeek = async () => {
    if (!selectedBranchForWeek) {
      toast.error("Please select a branch first");
      return;
    }

    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    
    startTransition(async () => {
      try {
        const result = await getWeeklySchedule(selectedBranchForWeek, previousWeekStart);
        if (result.success && result.data) {
          // Copy each schedule from previous week to current week
          let copiedCount = 0;
          
          for (const [dateKey, schedules] of Object.entries(result.data)) {
            const originalDate = new Date(dateKey);
            const newDate = new Date(originalDate);
            newDate.setDate(newDate.getDate() + 7); // Add 7 days
            
            for (const schedule of schedules) {
              const copyResult = await scheduleShift({
                staffId: schedule.staff.id,
                branchId: selectedBranchForWeek,
                date: newDate,
                shiftStart: new Date(schedule.shiftStart),
                shiftEnd: new Date(schedule.shiftEnd),
              });
              
              if (copyResult.success) {
                copiedCount++;
              }
            }
          }
          
          if (copiedCount > 0) {
            toast.success(`Copied ${copiedCount} schedules from previous week`);
            loadWeeklySchedule(selectedBranchForWeek); // Refresh the weekly view
          } else {
            toast.info("No schedules found to copy from previous week");
          }
        } else {
          toast.error("Failed to load previous week's schedule");
        }
      } catch {
        toast.error("Failed to copy previous week's schedule");
      }
    });
  };

  const handleAutoFill = async () => {
    if (!selectedBranchForWeek) {
      toast.error("Please select a branch first");
      return;
    }

    const branch = branches.find(b => b.id === selectedBranchForWeek);
    if (!branch) return;

    const requiredStaff = branch.requiredStaff || 5;
    const branchStaff = allStaff.filter(staff => staff.branchId === selectedBranchForWeek);
    
    if (branchStaff.length < requiredStaff) {
      toast.error(`Not enough staff in branch. Required: ${requiredStaff}, Available: ${branchStaff.length}`);
      return;
    }

    startTransition(async () => {
      const dateObj = new Date(autoFillDate);
      let scheduledCount = 0;

      // Schedule staff based on roles and required count
      const staffToSchedule = branchStaff.slice(0, requiredStaff);
      
      for (const staff of staffToSchedule) {
        // Assign different shifts based on role
        let shiftTemplate = shiftTemplates.full;
        if (staff.role === 'KITCHEN') shiftTemplate = shiftTemplates.morning;
        if (staff.role === 'SERVICE') shiftTemplate = shiftTemplates.evening;
        if (staff.role === 'MANAGER') shiftTemplate = shiftTemplates.full;

        const shiftStart = new Date(dateObj);
        const [startHour, startMin] = shiftTemplate.start.split(":").map(Number);
        shiftStart.setHours(startHour, startMin, 0, 0);

        const shiftEnd = new Date(dateObj);
        const [endHour, endMin] = shiftTemplate.end.split(":").map(Number);
        shiftEnd.setHours(endHour, endMin, 0, 0);

        const result = await scheduleShift({
          staffId: staff.id,
          branchId: selectedBranchForWeek,
          date: dateObj,
          shiftStart,
          shiftEnd,
        });

        if (result.success) {
          scheduledCount++;
        }
      }

      if (scheduledCount > 0) {
        toast.success(`Auto-filled ${scheduledCount} staff schedules`);
        setIsAutoFillOpen(false);
        if (selectedBranchForWeek) loadWeeklySchedule(selectedBranchForWeek);
      } else {
        toast.error("Failed to auto-fill schedules");
      }
    });
  };

  const handleClockIn = async (staffId: string) => {
    setClockingStaffId(staffId);
    startTransition(async () => {
      const result = await clockIn(staffId);
      if (result.success) {
        toast.success("Clocked in successfully");
      } else {
        toast.error(result.error || "Failed to clock in");
      }
      setClockingStaffId(null);
    });
  };

  const handleClockOut = async (staffId: string) => {
    setClockingStaffId(staffId);
    startTransition(async () => {
      const result = await clockOut(staffId);
      if (result.success) {
        toast.success("Clocked out successfully");
      } else {
        toast.error(result.error || "Failed to clock out");
      }
      setClockingStaffId(null);
    });
  };

  const loadWeeklySchedule = async (branchId: string) => {
    if (!branchId) return;
    setLoadingWeek(true);
    try {
      const result = await getWeeklySchedule(branchId, weekStart);
      if (result.success && result.data) {
        setWeeklySchedule(result.data);
      }
    } catch {
      toast.error("Failed to load weekly schedule");
    } finally {
      setLoadingWeek(false);
    }
  };

  const loadTimesheetData = async () => {
    setLoadingTimesheet(true);
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const result = await getTimesheetData(
        branchFilter === "all" ? undefined : branchFilter,
        startOfMonth,
        new Date()
      );
      if (result.success && result.data) {
        setTimesheetData(result.data as TimesheetEntry[]);
      }
    } catch {
      toast.error("Failed to load timesheet data");
    } finally {
      setLoadingTimesheet(false);
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-4">
      {/* Summary Cards - Compact */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Total Staff</p>
                <p className="text-base font-bold mt-0.5">{totalStaff}</p>
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
                <p className="text-[11px] font-medium text-muted-foreground truncate">On Duty</p>
                <p className="text-base font-bold mt-0.5 text-emerald-600">{totalOnDuty}</p>
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
                <p className="text-[11px] font-medium text-muted-foreground truncate">Off Duty</p>
                <p className="text-base font-bold mt-0.5">{totalStaff - totalOnDuty}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-slate-100 dark:bg-slate-900/30">
                <UserX className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "kpi-card rounded-xl",
          understaffedBranches > 0 && "border-red-200/50 dark:border-red-800/50"
        )}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Understaffed</p>
                <p className={cn(
                  "text-base font-bold mt-0.5",
                  understaffedBranches > 0 ? "text-red-600" : "text-emerald-600"
                )}>
                  {understaffedBranches}
                </p>
              </div>
              <div className={cn(
                "rounded-lg p-1.5 shrink-0",
                understaffedBranches > 0 
                  ? "bg-red-100 dark:bg-red-900/30" 
                  : "bg-emerald-100 dark:bg-emerald-900/30"
              )}>
                <AlertCircle className={cn(
                  "h-4 w-4",
                  understaffedBranches > 0 ? "text-red-600" : "text-emerald-600"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-9">
            <TabsTrigger value="overview" className="text-xs px-3">Branch Overview</TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs px-3">Todays Schedule</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs px-3" onClick={() => {
              if (selectedBranchForWeek) loadWeeklySchedule(selectedBranchForWeek);
            }}>
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="timesheet" className="text-xs px-3" onClick={loadTimesheetData}>
              <DollarSign className="mr-1.5 h-3.5 w-3.5" />
              Timesheet
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setIsBulkImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setIsAddStaffOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setIsScheduleOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Schedule
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="mt-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Staff by Branch</CardTitle>
              <CardDescription>Current staffing levels across all branches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {summary.map((branch) => {
                  const percentage = Math.min((branch.onDuty / branch.required) * 100, 100);
                  return (
                    <div key={branch.branchId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{branch.branchName}</span>
                          {getBranchStatusBadge(branch.status)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {branch.onDuty} / {branch.required} required
                        </span>
                      </div>
                      <Progress
                        value={percentage}
                        className={cn(
                          "h-2",
                          branch.status === "adequate" && "bg-emerald-100 [&>div]:bg-emerald-500",
                          branch.status === "understaffed" && "bg-red-100 [&>div]:bg-red-500",
                          branch.status === "overstaffed" && "bg-amber-100 [&>div]:bg-amber-500"
                        )}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Total staff: {branch.totalStaff}</span>
                        <span>On duty: {branch.onDuty}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Today&apos;s Schedule
                  </CardTitle>
                  <CardDescription>Staff schedules for today</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="ON_DUTY">On Duty</SelectItem>
                      <SelectItem value="OFF_DUTY">Off Duty</SelectItem>
                      <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                      <SelectItem value="SICK">Sick</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-xs">Branch</TableHead>
                    <TableHead className="text-xs">Shift</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedule.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="py-2">
                        <div>
                          <p className="text-sm font-medium">{staff.name}</p>
                          <p className="text-xs text-muted-foreground">{staff.employeeId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">{getRoleBadge(staff.role)}</TableCell>
                      <TableCell className="py-2 text-sm">{staff.branchName}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {staff.shiftStart} - {staff.shiftEnd}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">{getStatusBadge(staff.status)}</TableCell>
                      <TableCell className="py-2 text-right">
                        {staff.status === "ON_DUTY" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleClockOut(staff.id)}
                            disabled={clockingStaffId === staff.id}
                          >
                            {clockingStaffId === staff.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Square className="mr-1 h-3 w-3" />
                                Clock Out
                              </>
                            )}
                          </Button>
                        ) : staff.status === "OFF_DUTY" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleClockIn(staff.id)}
                            disabled={clockingStaffId === staff.id}
                          >
                            {clockingStaffId === staff.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Play className="mr-1 h-3 w-3" />
                                Clock In
                              </>
                            )}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="mt-6">
          <Card className="glass">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Weekly Schedule
                  </CardTitle>
                  <CardDescription>View and manage weekly shifts</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedBranchForWeek} onValueChange={(v) => {
                    setSelectedBranchForWeek(v);
                    loadWeeklySchedule(v);
                  }}>
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={handleCopyPreviousWeek}
                    disabled={!selectedBranchForWeek || isPending}
                  >
                    Copy Previous Week
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={() => setIsAutoFillOpen(true)}
                    disabled={!selectedBranchForWeek || isPending}
                  >
                    Auto-Fill Day
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
                      const newWeek = subWeeks(weekStart, 1);
                      setWeekStart(newWeek);
                      if (selectedBranchForWeek) loadWeeklySchedule(selectedBranchForWeek);
                    }}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium w-32 text-center">
                      {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
                      const newWeek = addWeeks(weekStart, 1);
                      setWeekStart(newWeek);
                      if (selectedBranchForWeek) loadWeeklySchedule(selectedBranchForWeek);
                    }}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingWeek ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !selectedBranchForWeek ? (
                <div className="text-center py-12 text-muted-foreground">
                  Select a branch to view the weekly schedule
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const daySchedules = weeklySchedule[dateKey] || [];
                    const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                    
                    return (
                      <div key={dateKey} className={cn(
                        "border rounded-lg p-2 min-h-[180px]",
                        isToday && "border-primary bg-primary/5"
                      )}>
                        <div className={cn(
                          "text-xs font-medium mb-2 pb-1 border-b",
                          isToday && "text-primary"
                        )}>
                          <div>{format(day, "EEE")}</div>
                          <div className="text-lg">{format(day, "d")}</div>
                        </div>
                        <div className="space-y-1">
                          {daySchedules.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">No shifts</p>
                          ) : (
                            daySchedules.map((shift) => (
                              <div key={shift.id} className="text-xs bg-muted/50 rounded p-1.5">
                                <div className="font-medium truncate">
                                  {shift.staff.firstName} {shift.staff.lastName.charAt(0)}.
                                </div>
                                <div className="text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  {format(new Date(shift.shiftStart), "HH:mm")} - {format(new Date(shift.shiftEnd), "HH:mm")}
                                </div>
                                <Badge variant="outline" className="mt-1 text-[10px] h-4">
                                  {shift.staff.role}
                                </Badge>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timesheet" className="mt-6">
          <Card className="glass">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Timesheet & Payroll
                  </CardTitle>
                  <CardDescription>Hours worked and estimated pay for current month</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-8" onClick={loadTimesheetData}>
                  {loadingTimesheet ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTimesheet ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : timesheetData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No timesheet data available. Click refresh to load.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Employee</TableHead>
                      <TableHead className="text-xs">Role</TableHead>
                      <TableHead className="text-xs">Branch</TableHead>
                      <TableHead className="text-xs text-right">Hours</TableHead>
                      <TableHead className="text-xs text-right">Rate</TableHead>
                      <TableHead className="text-xs text-right">Est. Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timesheetData.map((entry) => (
                      <TableRow key={entry.staff.id}>
                        <TableCell className="py-2">
                          <div>
                            <p className="text-sm font-medium">{entry.staff.firstName} {entry.staff.lastName}</p>
                            <p className="text-xs text-muted-foreground">{entry.staff.employeeId}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">{getRoleBadge(entry.staff.role)}</TableCell>
                        <TableCell className="py-2 text-sm">{entry.branch?.name || "-"}</TableCell>
                        <TableCell className="py-2 text-sm text-right font-medium">{entry.totalHours.toFixed(1)}h</TableCell>
                        <TableCell className="py-2 text-sm text-right">GH₵ {entry.staff.hourlyRate.toFixed(2)}/h</TableCell>
                        <TableCell className="py-2 text-right">
                          <span className="font-bold text-emerald-600">GH₵ {entry.estimatedPay.toFixed(2)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={3} className="font-medium">Total</TableCell>
                      <TableCell className="text-right font-bold">
                        {timesheetData.reduce((sum, e) => sum + e.totalHours, 0).toFixed(1)}h
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        GH₵ {timesheetData.reduce((sum, e) => sum + e.estimatedPay, 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Staffing Analytics</CardTitle>
              <CardDescription>
                Insights on staffing patterns and efficiency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Staffing Efficiency</h4>
                  <p className="text-sm text-muted-foreground">
                    Analysis of staffing levels vs revenue correlation will be displayed here.
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Shift Coverage</h4>
                  <p className="text-sm text-muted-foreground">
                    Shift coverage patterns and gap analysis will be displayed here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Schedule Dialog */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Shift</DialogTitle>
            <DialogDescription>
              {isBulkMode ? "Schedule multiple staff members for the same shift" : "Add a new shift for a staff member"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Mode Toggle */}
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant={!isBulkMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsBulkMode(false)}
              >
                Single Staff
              </Button>
              <Button
                type="button"
                variant={isBulkMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsBulkMode(true)}
              >
                Bulk Schedule
              </Button>
            </div>

            {/* Shift Template Selection */}
            <div className="space-y-2">
              <Label>Shift Template (Optional)</Label>
              <Select value={scheduleForm.shiftTemplate} onValueChange={handleShiftTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a preset or set custom times" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(shiftTemplates).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Staff Selection */}
            {!isBulkMode ? (
              <div className="space-y-2">
                <Label>Staff Member</Label>
                <Select value={scheduleForm.staffId} onValueChange={(v) => setScheduleForm(prev => ({ ...prev, staffId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {allStaff.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.firstName} {staff.lastName} ({staff.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select Staff Members ({scheduleForm.selectedStaff.length} selected)</Label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                  {allStaff.map((staff) => (
                    <div key={staff.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`staff-${staff.id}`}
                        checked={scheduleForm.selectedStaff.includes(staff.id)}
                        onChange={(e) => handleStaffSelection(staff.id, e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor={`staff-${staff.id}`} className="text-sm flex-1 cursor-pointer">
                        {staff.firstName} {staff.lastName} ({staff.role})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={scheduleForm.date}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shift Start</Label>
                <Input
                  type="time"
                  value={scheduleForm.shiftStart}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, shiftStart: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Shift End</Label>
                <Input
                  type="time"
                  value={scheduleForm.shiftEnd}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, shiftEnd: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSchedule} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Schedule Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Fill Dialog */}
      <Dialog open={isAutoFillOpen} onOpenChange={setIsAutoFillOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Auto-Fill Schedule</DialogTitle>
            <DialogDescription>
              Automatically schedule staff based on branch requirements and roles
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={autoFillDate}
                onChange={(e) => setAutoFillDate(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>This will automatically schedule staff based on:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Branch required staff count</li>
                <li>Staff roles (Kitchen → Morning, Service → Evening, Manager → Full Day)</li>
                <li>Available staff in the selected branch</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAutoFillOpen(false)}>Cancel</Button>
            <Button onClick={handleAutoFill} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Auto-Fill Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Staff Form */}
      <AddStaffForm 
        open={isAddStaffOpen} 
        onOpenChange={setIsAddStaffOpen} 
        branches={branches} 
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        type="staff"
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
