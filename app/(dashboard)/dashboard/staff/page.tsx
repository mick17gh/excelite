import { Suspense } from "react";
import { StaffContent } from "@/components/staff/staff-content";
import { getStaff, getStaffSummary, getSchedules } from "@/lib/actions/staff";
import { getBranches } from "@/lib/actions/branches";

export const metadata = {
  title: "Staff Management",
  description: "Track staff availability and scheduling across all branches",
};

export default async function StaffPage() {
  const today = new Date();
  const [branchesResult, staffResult, , schedulesResult] = await Promise.all([
    getBranches(),
    getStaff(undefined, { page: 1, pageSize: 500 }),
    getStaffSummary(),
    getSchedules(undefined, today, today),
  ]);

  const branchList = (branchesResult.data || []).map((branch: any) => {
    const { taxRate, ...rest } = branch;
    return {
      ...rest,
      taxRate: taxRate ? Number(taxRate) : 0,
    };
  });
  const rawStaffData = staffResult.data || [];
  const todaySchedules = schedulesResult.data || [];
  
  // Convert Decimal fields to numbers for client component compatibility
  const rawStaff = rawStaffData.map((staff: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    jobRoleId: string;
    role: string;
    roleCode?: string;
    jobRole?: { defaultShiftTemplate?: string | null } | null;
    hourlyRate: number | string;
    hireDate: Date;
    branchId: string;
    isActive: boolean;
    dutyStatus: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    branch: { id: string; name: string; code: string } | null;
  }) => ({
    ...staff,
    hourlyRate: Number(staff.hourlyRate),
    defaultShiftTemplate: staff.jobRole?.defaultShiftTemplate ?? null,
  }));
  
  // Create a map of staff schedules for today
  const scheduleMap = new Map<string, { staffId: string; shiftStart: Date; shiftEnd: Date }>();
  todaySchedules.forEach((schedule: { staffId: string; shiftStart: Date; shiftEnd: Date }) => {
    scheduleMap.set(schedule.staffId, schedule);
  });
  
  const schedule = rawStaff.map((staff) => {
    const todaySchedule = scheduleMap.get(staff.id);
    return {
      id: staff.id,
      employeeId: staff.employeeId,
      name: `${staff.firstName} ${staff.lastName}`,
      role: staff.role,
      branchName: staff.branch?.name || "Unknown",
      shiftStart: todaySchedule ? new Date(todaySchedule.shiftStart).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : "Not Scheduled",
      shiftEnd: todaySchedule ? new Date(todaySchedule.shiftEnd).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : "Not Scheduled",
      status: staff.dutyStatus,
      hasSchedule: !!todaySchedule,
    };
  });
  const summary = branchList.map((branch: { id: string; name: string; requiredStaff?: number }) => {
    const branchStaff = rawStaff.filter((staff: { branchId: string }) => staff.branchId === branch.id);
    const onDutyCount = branchStaff.filter((staff: { dutyStatus: string }) => staff.dutyStatus === "ON_DUTY").length;
    const required = branch.requiredStaff || 5;
    const status = onDutyCount >= required ? "adequate" : onDutyCount >= required * 0.8 ? "warning" : "understaffed";
    
    return {
      branchId: branch.id,
      branchName: branch.name,
      totalStaff: branchStaff.length,
      onDuty: onDutyCount,
      required,
      status: status as "adequate" | "understaffed" | "overstaffed",
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          Staff Availability
        </h1>
        <p className="text-muted-foreground">
          Monitor staff scheduling and availability across all branches
        </p>
      </div>

      <Suspense fallback={<StaffLoadingSkeleton />}>
        <StaffContent
          summary={summary}
          schedule={schedule}
          branches={branchList}
          allStaff={rawStaff}
        />
      </Suspense>
    </div>
  );
}

function StaffLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
