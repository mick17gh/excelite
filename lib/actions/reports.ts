"use server";

import { db } from "@/lib/db";

export type ReportId =
  | "executive-summary"
  | "weekly-performance"
  | "sales-report"
  | "inventory-report"
  | "waste-variance"
  | "staff-report";

export interface GenerateReportInput {
  reportId: ReportId;
  branchId?: string; // undefined => all
  startDate: Date;
  endDate: Date;
}

export async function generateReportData(input: GenerateReportInput) {
  const branchFilter = input.branchId ? { branchId: input.branchId } : {};

  switch (input.reportId) {
    case "executive-summary": {
      const [sales, waste, lowStockCount] = await Promise.all([
        db.sale.findMany({
          where: {
            deletedAt: null,
            ...branchFilter,
            saleDate: { gte: input.startDate, lte: input.endDate },
          },
          include: { items: true },
        }),
        db.wasteLog.findMany({
          where: {
            ...branchFilter,
            wasteDate: { gte: input.startDate, lte: input.endDate },
          },
        }),
        db.inventoryItem.count({
          where: {
            deletedAt: null,
            isActive: true,
            ...branchFilter,
            currentStock: { lte: db.inventoryItem.fields.reorderPoint },
          } as any,
        }),
      ]);

      const totalRevenue = sales.reduce((s, x) => s + Number(x.total), 0);
      const transactionCount = sales.length;
      const averageTicket = transactionCount ? totalRevenue / transactionCount : 0;
      const totalCogs = sales.reduce((sum, sale) => {
        return (
          sum +
          sale.items.reduce(
            (s, it) => s + Number(it.unitCost) * Number(it.quantity),
            0
          )
        );
      }, 0);
      const cogsPct = totalRevenue ? (totalCogs / totalRevenue) * 100 : 0;
      const wasteTotal = waste.reduce((s, w) => s + Number(w.totalCost), 0);

      return {
        success: true,
        data: {
          reportId: input.reportId,
          period: { startDate: input.startDate, endDate: input.endDate },
          totals: {
            totalRevenue,
            transactionCount,
            averageTicket,
            cogsPercentage: cogsPct,
            wasteTotal,
            lowStockCount,
          },
        },
      };
    }

    default:
      return {
        success: false,
        error: "Report type not implemented yet",
      };
  }
}

