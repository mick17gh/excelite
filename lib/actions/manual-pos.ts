"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SalesChannel } from "@/lib/generated/prisma/client";

export interface ManualEntryLineInput {
  date: Date;
  channel: SalesChannel;
  totalRevenue: number;
  transactionCount: number;
  menuItemId?: string;
  notes?: string;
}

export interface CreateManualEntryBatchInput {
  branchId: string;
  periodStart: Date;
  periodEnd: Date;
  createdByUserId?: string;
  notes?: string;
  lines: ManualEntryLineInput[];
}

export async function createManualEntryBatchWithLines(
  input: CreateManualEntryBatchInput
) {
  try {
    const batch = await db.manualEntryBatch.create({
      data: {
        branchId: input.branchId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        createdBy: input.createdByUserId,
        notes: input.notes,
        lines: {
          create: input.lines.map((line) => ({
            date: line.date,
            channel: line.channel,
            totalRevenue: line.totalRevenue,
            transactionCount: line.transactionCount,
            menuItemId: line.menuItemId,
            notes: line.notes,
          })),
        },
      },
      include: {
        lines: true,
      },
    });

    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard");
    return { success: true, data: batch };
  } catch (error) {
    console.error("[createManualEntryBatchWithLines] Error:", error);
    return {
      success: false,
      error: "Failed to create manual entry batch",
    };
  }
}

export async function getManualEntriesForBranch(branchId: string) {
  try {
    const batches = await db.manualEntryBatch.findMany({
      where: { branchId },
      include: {
        lines: true,
      },
      orderBy: { periodStart: "desc" },
    });

    return { success: true, data: batches };
  } catch (error) {
    console.error("[getManualEntriesForBranch] Error:", error);
    return { success: false, error: "Failed to fetch manual entries", data: [] };
  }
}

