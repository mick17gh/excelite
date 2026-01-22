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

function generateSaleNumber(): string {
  const prefix = "MAN";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

function getDayPart(date: Date): "BREAKFAST" | "LUNCH" | "DINNER" | "LATE_NIGHT" {
  const hour = date.getHours();
  if (hour >= 6 && hour < 11) return "BREAKFAST";
  if (hour >= 11 && hour < 15) return "LUNCH";
  if (hour >= 15 && hour < 21) return "DINNER";
  return "LATE_NIGHT";
}

export async function createManualEntryBatchWithLines(
  input: CreateManualEntryBatchInput
) {
  try {
    // Create the manual entry batch for record keeping
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

    // Also create Sale records so they appear in dashboard and reports
    // For each manual entry line, create a summarized sale record
    for (const line of input.lines) {
      const avgTicket = line.transactionCount > 0 
        ? line.totalRevenue / line.transactionCount 
        : line.totalRevenue;
      
      // Create a summarized sale record for reporting
      await db.sale.create({
        data: {
          saleNumber: generateSaleNumber(),
          branchId: input.branchId,
          subtotal: line.totalRevenue / 1.125, // Reverse calculate subtotal from total (assuming 12.5% tax)
          tax: line.totalRevenue - (line.totalRevenue / 1.125),
          discount: 0,
          total: line.totalRevenue,
          dayPart: getDayPart(line.date),
          channel: line.channel,
          customerCount: line.transactionCount,
          saleDate: line.date,
        },
      });
    }

    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard");
    return { 
      success: true, 
      data: {
        ...batch,
        lines: batch.lines.map(line => ({
          ...line,
          totalRevenue: Number(line.totalRevenue)
        }))
      }
    };
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

