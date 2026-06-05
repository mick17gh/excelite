"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { DutyStatus } from "@/lib/generated/prisma/client";

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  error?: string;
}

export interface CreateStaffInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobRoleId: string;
  hourlyRate: number;
  branchId: string;
  hireDate: Date;
}

export interface UpdateStaffInput {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  jobRoleId?: string;
  hourlyRate?: number;
  hireDate?: Date;
  branchId?: string;
  isActive?: boolean;
}

function generateEmployeeId(): string {
  const prefix = "EMP";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

function mapStaffRecord(s: {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobRoleId: string;
  hourlyRate: { toString(): string } | number;
  hireDate: Date;
  branchId: string;
  isActive: boolean;
  dutyStatus: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  branch?: unknown;
  jobRole?: {
    id: string;
    name: string;
    code: string;
    category: string | null;
    defaultShiftTemplate: string | null;
  } | null;
}) {
  return {
    id: s.id,
    employeeId: s.employeeId,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
    phone: s.phone,
    jobRoleId: s.jobRoleId,
    role: s.jobRole?.name ?? "Unknown",
    roleCode: s.jobRole?.code ?? "",
    jobRole: s.jobRole ?? null,
    hourlyRate: Number(s.hourlyRate),
    hireDate: s.hireDate,
    branchId: s.branchId,
    isActive: s.isActive,
    dutyStatus: s.dutyStatus,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    deletedAt: s.deletedAt,
    branch: s.branch,
  };
}

const staffInclude = {
  branch: true,
  jobRole: {
    select: {
      id: true,
      name: true,
      code: true,
      category: true,
      defaultShiftTemplate: true,
    },
  },
} as const;

export async function createStaff(input: CreateStaffInput) {
  try {
    const staff = await db.staff.create({
      data: {
        employeeId: generateEmployeeId(),
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        jobRoleId: input.jobRoleId,
        hourlyRate: input.hourlyRate,
        branchId: input.branchId,
        hireDate: input.hireDate,
        isActive: true,
        dutyStatus: "OFF_DUTY",
      },
      include: staffInclude,
    });

    revalidatePath("/dashboard/staff");
    return { success: true, data: mapStaffRecord(staff) };
  } catch (error) {
    console.error("[createStaff] Error:", error);
    return { success: false, error: "Failed to create staff member" };
  }
}

export async function updateStaff(input: UpdateStaffInput) {
  try {
    const { id, ...data } = input;
    const staff = await db.staff.update({
      where: { id },
      data,
      include: staffInclude,
    });

    revalidatePath("/dashboard/staff");
    return { success: true, data: mapStaffRecord(staff) };
  } catch (error) {
    console.error("[updateStaff] Error:", error);
    return { success: false, error: "Failed to update staff member" };
  }
}

export async function deleteStaff(id: string) {
  try {
    await db.staff.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (error) {
    console.error("[deleteStaff] Error:", error);
    return { success: false, error: "Failed to delete staff member" };
  }
}

export async function getStaff(
  branchId?: string,
  pagination?: PaginationParams
): Promise<PaginatedResult<any>> {
  try {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where = {
      deletedAt: null,
      ...(branchId && { branchId }),
    };

    const [staff, totalItems] = await Promise.all([
      db.staff.findMany({
        where,
        include: staffInclude,
        orderBy: { lastName: "asc" },
        skip,
        take: pageSize,
      }),
      db.staff.count({ where }),
    ]);

    return {
      success: true,
      data: staff.map(mapStaffRecord),
      pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  } catch (error) {
    console.error("[getStaff] Error:", error);
    return {
      success: false,
      error: "Failed to fetch staff",
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    };
  }
}

export async function getStaffById(id: string) {
  try {
    const staff = await db.staff.findUnique({
      where: { id },
      include: {
        ...staffInclude,
        schedules: {
          orderBy: { scheduledDate: "desc" },
          take: 10,
        },
      },
    });

    if (!staff) {
      return { success: false, error: "Staff member not found" };
    }

    return {
      success: true,
      data: {
        ...mapStaffRecord(staff),
        schedules: staff.schedules,
      },
    };
  } catch (error) {
    console.error("[getStaffById] Error:", error);
    return { success: false, error: "Failed to fetch staff member" };
  }
}

export interface ScheduleShiftInput {
  staffId: string;
  branchId: string;
  date: Date;
  shiftStart: Date;
  shiftEnd: Date;
  notes?: string;
}

export async function scheduleShift(input: ScheduleShiftInput) {
  try {
    const schedule = await db.staffSchedule.create({
      data: {
        staffId: input.staffId,
        branchId: input.branchId,
        scheduledDate: input.date,
        shiftStart: input.shiftStart,
        shiftEnd: input.shiftEnd,
        notes: input.notes,
        status: "OFF_DUTY",
      },
    });

    revalidatePath("/dashboard/staff");
    return { success: true, data: schedule };
  } catch (error) {
    console.error("[scheduleShift] Error:", error);
    return { success: false, error: "Failed to schedule shift" };
  }
}

export async function clockIn(staffId: string, notes?: string) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let schedule = await db.staffSchedule.findFirst({
      where: { staffId, scheduledDate: today },
    });

    if (schedule) {
      schedule = await db.staffSchedule.update({
        where: { id: schedule.id },
        data: {
          actualStart: now,
          status: "ON_DUTY",
          notes: notes ? `${schedule.notes || ""}\nClock in: ${notes}` : schedule.notes,
        },
      });
    }

    await db.staff.update({
      where: { id: staffId },
      data: { dutyStatus: "ON_DUTY" },
    });

    revalidatePath("/dashboard/staff");
    return { success: true, data: schedule };
  } catch (error) {
    console.error("[clockIn] Error:", error);
    return { success: false, error: "Failed to clock in" };
  }
}

export async function clockOut(staffId: string, notes?: string) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const schedule = await db.staffSchedule.findFirst({
      where: { staffId, scheduledDate: today, status: "ON_DUTY" },
    });

    if (schedule) {
      await db.staffSchedule.update({
        where: { id: schedule.id },
        data: {
          actualEnd: now,
          status: "OFF_DUTY",
          notes: notes ? `${schedule.notes || ""}\nClock out: ${notes}` : schedule.notes,
        },
      });
    }

    await db.staff.update({
      where: { id: staffId },
      data: { dutyStatus: "OFF_DUTY" },
    });

    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (error) {
    console.error("[clockOut] Error:", error);
    return { success: false, error: "Failed to clock out" };
  }
}

export async function getStaffSummary() {
  try {
    const branches = await db.branch.findMany({
      where: { deletedAt: null, isActive: true },
      include: {
        staff: { where: { deletedAt: null, isActive: true } },
      },
    });

    const summary = branches.map((branch) => {
      const totalStaff = branch.staff.length;
      const onDuty = branch.staff.filter((s) => s.dutyStatus === "ON_DUTY").length;
      const required = Math.ceil(totalStaff * 0.6);

      let status: "adequate" | "understaffed" | "overstaffed" = "adequate";
      if (onDuty < required * 0.8) status = "understaffed";
      else if (onDuty > required * 1.2) status = "overstaffed";

      return {
        branchId: branch.id,
        branchName: branch.name,
        totalStaff,
        onDuty,
        required,
        status,
      };
    });

    return { success: true, data: summary };
  } catch (error) {
    console.error("[getStaffSummary] Error:", error);
    return { success: false, error: "Failed to fetch staff summary", data: [] };
  }
}

export async function getStaffByBranch(branchId?: string) {
  try {
    const staff = await db.staff.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(branchId && { branchId }),
      },
      include: staffInclude,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    return { success: true, data: staff.map(mapStaffRecord) };
  } catch (error) {
    console.error("[getStaffByBranch] Error:", error);
    return { success: false, error: "Failed to fetch staff", data: [] };
  }
}

const scheduleStaffSelect = {
  id: true,
  employeeId: true,
  firstName: true,
  lastName: true,
  jobRole: { select: { id: true, name: true, code: true, defaultShiftTemplate: true } },
} as const;

export async function getSchedules(
  branchId?: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    const start = startDate || new Date();
    const end = endDate || new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    const schedules = await db.staffSchedule.findMany({
      where: {
        ...(branchId && { branchId }),
        scheduledDate: { gte: start, lte: end },
      },
      include: {
        staff: { select: scheduleStaffSelect },
        branch: { select: { id: true, name: true } },
      },
      orderBy: [{ scheduledDate: "asc" }, { shiftStart: "asc" }],
    });

    const mapped = schedules.map((s) => ({
      ...s,
      staff: {
        ...s.staff,
        role: s.staff.jobRole?.name ?? "Unknown",
        roleCode: s.staff.jobRole?.code ?? "",
      },
    }));

    return { success: true, data: mapped };
  } catch (error) {
    console.error("[getSchedules] Error:", error);
    return { success: false, error: "Failed to fetch schedules", data: [] };
  }
}

export async function updateSchedule(
  scheduleId: string,
  data: {
    shiftStart?: Date;
    shiftEnd?: Date;
    notes?: string;
    status?: DutyStatus;
  }
) {
  try {
    const schedule = await db.staffSchedule.update({
      where: { id: scheduleId },
      data,
    });

    revalidatePath("/dashboard/staff");
    return { success: true, data: schedule };
  } catch (error) {
    console.error("[updateSchedule] Error:", error);
    return { success: false, error: "Failed to update schedule" };
  }
}

export async function deleteSchedule(scheduleId: string) {
  try {
    await db.staffSchedule.delete({ where: { id: scheduleId } });
    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (error) {
    console.error("[deleteSchedule] Error:", error);
    return { success: false, error: "Failed to delete schedule" };
  }
}

export interface BatchScheduleInput {
  staffId: string;
  branchId: string;
  schedules: {
    date: Date;
    shiftStart: Date;
    shiftEnd: Date;
    notes?: string;
  }[];
}

export async function batchCreateSchedules(input: BatchScheduleInput) {
  try {
    const createdSchedules = await db.staffSchedule.createMany({
      data: input.schedules.map((schedule) => ({
        staffId: input.staffId,
        branchId: input.branchId,
        scheduledDate: schedule.date,
        shiftStart: schedule.shiftStart,
        shiftEnd: schedule.shiftEnd,
        notes: schedule.notes,
        status: "OFF_DUTY" as DutyStatus,
      })),
    });

    revalidatePath("/dashboard/staff");
    return { success: true, count: createdSchedules.count };
  } catch (error) {
    console.error("[batchCreateSchedules] Error:", error);
    return { success: false, error: "Failed to create schedules" };
  }
}

export async function getWeeklySchedule(branchId: string, weekStart: Date) {
  try {
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

    const schedules = (await Promise.race([
      db.staffSchedule.findMany({
        where: {
          branchId,
          scheduledDate: { gte: weekStart, lte: weekEnd },
        },
        include: { staff: { select: scheduleStaffSelect } },
        orderBy: [{ scheduledDate: "asc" }, { shiftStart: "asc" }],
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Query timeout")), 8000)
      ),
    ])) as Array<{
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
        jobRole: { id: string; name: string; code: string; defaultShiftTemplate: string | null } | null;
      };
    }>;

    const weekDays: Record<
      string,
      Array<{
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
      }>
    > = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split("T")[0];
      weekDays[dateKey] = [];
    }

    schedules.forEach((schedule) => {
      const dateKey = schedule.scheduledDate.toISOString().split("T")[0];
      if (weekDays[dateKey]) {
        weekDays[dateKey].push({
          id: schedule.id,
          staffId: schedule.staffId,
          branchId: schedule.branchId,
          scheduledDate: schedule.scheduledDate,
          shiftStart: schedule.shiftStart,
          shiftEnd: schedule.shiftEnd,
          staff: {
            id: schedule.staff.id,
            employeeId: schedule.staff.employeeId,
            firstName: schedule.staff.firstName,
            lastName: schedule.staff.lastName,
            role: schedule.staff.jobRole?.name ?? "Unknown",
          },
        });
      }
    });

    return { success: true, data: weekDays };
  } catch (error) {
    console.error("[getWeeklySchedule] Error:", error);

    const emptyWeek: { [key: string]: any[] } = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split("T")[0];
      emptyWeek[dateKey] = [];
    }

    return {
      success: false,
      error:
        error instanceof Error && error.message === "Query timeout"
          ? "Request timed out. Please try again."
          : "Failed to fetch weekly schedule",
      data: emptyWeek,
    };
  }
}

export async function swapShifts(schedule1Id: string, schedule2Id: string) {
  try {
    const [schedule1, schedule2] = await Promise.all([
      db.staffSchedule.findUnique({ where: { id: schedule1Id } }),
      db.staffSchedule.findUnique({ where: { id: schedule2Id } }),
    ]);

    if (!schedule1 || !schedule2) {
      return { success: false, error: "One or both schedules not found" };
    }

    await Promise.all([
      db.staffSchedule.update({
        where: { id: schedule1Id },
        data: { staffId: schedule2.staffId },
      }),
      db.staffSchedule.update({
        where: { id: schedule2Id },
        data: { staffId: schedule1.staffId },
      }),
    ]);

    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (error) {
    console.error("[swapShifts] Error:", error);
    return { success: false, error: "Failed to swap shifts" };
  }
}

export async function getAvailableStaff(branchId: string, date: Date) {
  try {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const scheduledStaffIds = await db.staffSchedule.findMany({
      where: {
        branchId,
        scheduledDate: { gte: dayStart, lte: dayEnd },
      },
      select: { staffId: true },
    });

    const scheduledIds = scheduledStaffIds.map((s) => s.staffId);

    const availableStaff = await db.staff.findMany({
      where: {
        branchId,
        isActive: true,
        deletedAt: null,
        id: { notIn: scheduledIds },
      },
      include: {
        jobRole: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    return {
      success: true,
      data: availableStaff.map((s) => ({
        id: s.id,
        employeeId: s.employeeId,
        firstName: s.firstName,
        lastName: s.lastName,
        role: s.jobRole?.name ?? "Unknown",
        roleCode: s.jobRole?.code ?? "",
      })),
    };
  } catch (error) {
    console.error("[getAvailableStaff] Error:", error);
    return { success: false, error: "Failed to fetch available staff", data: [] };
  }
}

export async function getTimesheetData(
  branchId?: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    const start = startDate || new Date(new Date().setDate(1));
    const end = endDate || new Date();

    const schedules = await db.staffSchedule.findMany({
      where: {
        ...(branchId && { branchId }),
        scheduledDate: { gte: start, lte: end },
        actualStart: { not: null },
      },
      include: {
        staff: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            hourlyRate: true,
            jobRole: { select: { id: true, name: true, code: true } },
          },
        },
        branch: { select: { id: true, name: true } },
      },
      orderBy: [{ staffId: "asc" }, { scheduledDate: "asc" }],
    });

    type TimesheetStaff = {
      id: string;
      employeeId: string;
      firstName: string;
      lastName: string;
      role: string;
      hourlyRate: number;
    };

    const timesheetMap = new Map<
      string,
      {
        staff: TimesheetStaff;
        branch: (typeof schedules)[0]["branch"];
        totalHours: number;
        schedules: typeof schedules;
      }
    >();

    schedules.forEach((schedule) => {
      const existing = timesheetMap.get(schedule.staffId);
      let hoursWorked = 0;

      if (schedule.actualStart && schedule.actualEnd) {
        hoursWorked =
          (schedule.actualEnd.getTime() - schedule.actualStart.getTime()) /
          (1000 * 60 * 60);
      }

      const staffWithRole: TimesheetStaff = {
        id: schedule.staff.id,
        employeeId: schedule.staff.employeeId,
        firstName: schedule.staff.firstName,
        lastName: schedule.staff.lastName,
        role: schedule.staff.jobRole?.name ?? "Unknown",
        hourlyRate: Number(schedule.staff.hourlyRate),
      };

      if (existing) {
        existing.totalHours += hoursWorked;
        existing.schedules.push(schedule);
      } else {
        timesheetMap.set(schedule.staffId, {
          staff: staffWithRole,
          branch: schedule.branch,
          totalHours: hoursWorked,
          schedules: [schedule],
        });
      }
    });

    const timesheets = Array.from(timesheetMap.values()).map((entry) => ({
      staff: entry.staff,
      branch: entry.branch,
      totalHours: Math.round(entry.totalHours * 100) / 100,
      estimatedPay:
        Math.round(entry.totalHours * Number(entry.staff.hourlyRate) * 100) / 100,
      schedules: entry.schedules.map((schedule) => ({
        ...schedule,
        staff: {
          ...schedule.staff,
          role: schedule.staff.jobRole?.name ?? "Unknown",
          hourlyRate: Number(schedule.staff.hourlyRate),
        },
      })),
    }));

    return { success: true, data: timesheets };
  } catch (error) {
    console.error("[getTimesheetData] Error:", error);
    return { success: false, error: "Failed to fetch timesheet data", data: [] };
  }
}
