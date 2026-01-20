"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { StaffRole, DutyStatus } from "@/lib/generated/prisma/client";

export interface CreateStaffInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: StaffRole;
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
  role?: StaffRole;
  hourlyRate?: number;
  branchId?: string;
  isActive?: boolean;
}

function generateEmployeeId(): string {
  const prefix = "EMP";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

export async function createStaff(input: CreateStaffInput) {
  try {
    const staff = await db.staff.create({
      data: {
        employeeId: generateEmployeeId(),
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        role: input.role,
        hourlyRate: input.hourlyRate,
        branchId: input.branchId,
        hireDate: input.hireDate,
        isActive: true,
        dutyStatus: "OFF_DUTY",
      },
    });

    revalidatePath("/dashboard/staff");
    return { success: true, data: staff };
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
    });

    revalidatePath("/dashboard/staff");
    return { success: true, data: staff };
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

export async function getStaff(branchId?: string) {
  try {
    const staff = await db.staff.findMany({
      where: {
        deletedAt: null,
        ...(branchId && { branchId }),
      },
      include: {
        branch: true,
      },
      orderBy: { lastName: "asc" },
    });
    return { success: true, data: staff };
  } catch (error) {
    console.error("[getStaff] Error:", error);
    return { success: false, error: "Failed to fetch staff", data: [] };
  }
}

export async function getStaffById(id: string) {
  try {
    const staff = await db.staff.findUnique({
      where: { id },
      include: {
        branch: true,
        schedules: {
          orderBy: { scheduledDate: "desc" },
          take: 10,
        },
      },
    });
    return { success: true, data: staff };
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

    // Find today's schedule or create one
    let schedule = await db.staffSchedule.findFirst({
      where: {
        staffId,
        scheduledDate: today,
      },
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

    // Update staff duty status
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

    // Find today's schedule
    const schedule = await db.staffSchedule.findFirst({
      where: {
        staffId,
        scheduledDate: today,
        status: "ON_DUTY",
      },
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

    // Update staff duty status
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
        staff: {
          where: { deletedAt: null, isActive: true },
        },
      },
    });

    const summary = branches.map((branch) => {
      const totalStaff = branch.staff.length;
      const onDuty = branch.staff.filter((s) => s.dutyStatus === "ON_DUTY").length;
      const required = Math.ceil(totalStaff * 0.6); // Assume 60% staffing requirement

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
