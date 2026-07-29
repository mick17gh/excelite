"use server";

import { revalidatePath } from "next/cache";
import { assertBranchAccess, resolveReportViewer } from "@/lib/reports/auth";
import { buildReportData } from "@/lib/reports/generate-report";
import type { ReportId } from "@/lib/reports/types";

export type { ReportId } from "@/lib/reports/types";

export interface GenerateReportInput {
  reportId: ReportId;
  branchId?: string;
  startDate: Date;
  endDate: Date;
}

export interface ReportResult {
  success: boolean;
  data?: {
    reportId: ReportId;
    reportName: string;
    period: { startDate: Date; endDate: Date };
    branchName?: string;
    generatedAt: Date;
    [key: string]: unknown;
  };
  error?: string;
}

export async function generateReportData(input: GenerateReportInput): Promise<ReportResult> {
  try {
    const authResult = await resolveReportViewer(input.reportId);
    if (!authResult.ok) {
      return { success: false, error: authResult.error };
    }

    const branchId = assertBranchAccess(authResult.viewer, input.branchId);

    const startDate = new Date(input.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(input.endDate);
    endDate.setHours(23, 59, 59, 999);

    const data = await buildReportData(
      { ...input, branchId, startDate, endDate },
      authResult.viewer
    );

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate report";
    return { success: false, error: message };
  }
}

export async function saveReportToHistory(
  reportId: ReportId,
  reportName: string,
  format: "PDF" | "EXCEL",
  branchId?: string
) {
  void reportId;
  void reportName;
  void format;
  void branchId;
  revalidatePath("/dashboard/reports");
  return { success: true };
}

export async function getRecentReports(limit: number = 10) {
  void limit;
  return { success: true, data: [] };
}
