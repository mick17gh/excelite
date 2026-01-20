import { Suspense } from "react";
import { StaffContent } from "@/components/staff/staff-content";
import { getStaff, getStaffSummary } from "@/lib/actions/staff";
import { getBranches } from "@/lib/actions/branches";

export const metadata = {
  title: "Staff Management | Dinelytix",
  description: "Track staff availability and scheduling across all branches",
};

export default async function StaffPage() {
  const [branchesResult, staffResult, summaryResult] = await Promise.all([
    getBranches(),
    getStaff(),
    getStaffSummary(),
  ]);

  const branchList = branchesResult.data || [];
  const rawStaff = staffResult.data || [];
  const schedule = rawStaff.map((staff: { id: string; employeeId: string; firstName: string; lastName: string; role: string; branch: { name: string }; dutyStatus: string }) => ({
    id: staff.id,
    employeeId: staff.employeeId,
    name: `${staff.firstName} ${staff.lastName}`,
    role: staff.role,
    branchName: staff.branch?.name || "Unknown",
    shiftStart: "09:00",
    shiftEnd: "17:00",
    status: staff.dutyStatus === "ON_DUTY" ? "on-duty" : "off-duty",
  }));
  const rawSummaryData = summaryResult.data;
  const rawSummary = rawSummaryData && !Array.isArray(rawSummaryData) 
    ? rawSummaryData 
    : { totalStaff: 0, onDuty: 0, lateArrivals: 0, absences: 0 };
  const summary = branchList.map((branch: { id: string; name: string }) => ({
    branchId: branch.id,
    branchName: branch.name,
    totalStaff: Math.floor(rawSummary.totalStaff / Math.max(branchList.length, 1)),
    onDuty: Math.floor(rawSummary.onDuty / Math.max(branchList.length, 1)),
    required: 5,
    status: "adequate" as const,
  }));

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
