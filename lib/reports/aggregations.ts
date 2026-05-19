import { roundMoney } from "@/lib/reports/formatters";

export function saleCogs(items: { unitCost: unknown; quantity: unknown }[]): number {
  return items.reduce((s, it) => s + Number(it.unitCost) * Number(it.quantity), 0);
}

export function hourlyRevenueBuckets(
  sales: { saleDate: Date; total: unknown }[]
): Record<number, number> {
  const buckets: Record<number, number> = {};
  for (let h = 0; h < 24; h++) buckets[h] = 0;
  sales.forEach((sale) => {
    const h = sale.saleDate.getHours();
    buckets[h] = (buckets[h] || 0) + Number(sale.total);
  });
  return buckets;
}

export function peakHourFromBuckets(buckets: Record<number, number>): {
  hour: number;
  revenue: number;
} {
  let bestHour = 0;
  let bestRevenue = 0;
  Object.entries(buckets).forEach(([h, rev]) => {
    if (rev > bestRevenue) {
      bestRevenue = rev;
      bestHour = Number(h);
    }
  });
  return { hour: bestHour, revenue: roundMoney(bestRevenue) };
}

export function laborCostFromSchedules(
  schedules: {
    shiftStart: Date;
    shiftEnd: Date;
    staff?: { hourlyRate: unknown } | null;
  }[]
): number {
  return roundMoney(
    schedules.reduce((sum, sc) => {
      const hours =
        (sc.shiftEnd.getTime() - sc.shiftStart.getTime()) / (1000 * 60 * 60);
      return sum + hours * Number(sc.staff?.hourlyRate || 0);
    }, 0)
  );
}

export function ytdRange(endDate: Date): { start: Date; end: Date } {
  const start = new Date(endDate.getFullYear(), 0, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function priorYtdRange(endDate: Date): { start: Date; end: Date } {
  const start = new Date(endDate.getFullYear() - 1, 0, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
