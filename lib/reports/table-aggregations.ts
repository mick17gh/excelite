import { db } from "@/lib/db";
import { roundMoney } from "@/lib/reports/formatters";

export interface ClosedSessionRow {
  sessionId: string;
  branchName: string;
  sectionName: string;
  tableLabel: string;
  waiterName: string;
  covers: number;
  orderCount: number;
  revenue: number;
  durationMinutes: number;
  openedAt: Date;
  closedAt: Date;
}

export async function fetchClosedTableSessions(input: {
  branchId?: string;
  startDate: Date;
  endDate: Date;
}): Promise<ClosedSessionRow[]> {
  const sessions = await db.tableSession.findMany({
    where: {
      status: "CLOSED",
      closedAt: { gte: input.startDate, lte: input.endDate },
      ...(input.branchId ? { branchId: input.branchId } : {}),
    },
    include: {
      branch: { select: { name: true } },
      table: { include: { section: { select: { name: true } } } },
      opener: { select: { name: true } },
      orders: {
        where: { paymentStatus: "PAID" },
        select: { total: true },
      },
    },
  });

  return sessions.map((s) => {
    const revenue = s.orders.reduce((sum, o) => sum + Number(o.total), 0);
    const closedAt = s.closedAt ?? s.openedAt;
    const durationMinutes = Math.max(
      0,
      Math.round((closedAt.getTime() - s.openedAt.getTime()) / 60000),
    );
    return {
      sessionId: s.id,
      branchName: s.branch.name,
      sectionName: s.table.section?.name ?? "—",
      tableLabel: s.table.label,
      waiterName: s.opener.name,
      covers: s.guestCount,
      orderCount: s.orders.length,
      revenue: roundMoney(revenue),
      durationMinutes,
      openedAt: s.openedAt,
      closedAt,
    };
  });
}

export async function fetchWaiterPerformance(input: {
  branchId?: string;
  startDate: Date;
  endDate: Date;
}) {
  const sessions = await db.tableSession.findMany({
    where: {
      status: "CLOSED",
      closedAt: { gte: input.startDate, lte: input.endDate },
      ...(input.branchId ? { branchId: input.branchId } : {}),
    },
    include: {
      opener: { select: { id: true, name: true } },
      orders: {
        where: { paymentStatus: "PAID" },
        select: { total: true, status: true },
      },
    },
  });

  const byWaiter = new Map<
    string,
    {
      waiterName: string;
      tablesServed: number;
      covers: number;
      sales: number;
      durationTotal: number;
      voidCount: number;
    }
  >();

  for (const s of sessions) {
    const key = s.openedByUserId;
    const cur = byWaiter.get(key) ?? {
      waiterName: s.opener.name,
      tablesServed: 0,
      covers: 0,
      sales: 0,
      durationTotal: 0,
      voidCount: 0,
    };
    cur.tablesServed += 1;
    cur.covers += s.guestCount;
    cur.sales += s.orders.reduce((sum, o) => sum + Number(o.total), 0);
    const closedAt = s.closedAt ?? s.openedAt;
    cur.durationTotal += closedAt.getTime() - s.openedAt.getTime();
    cur.voidCount += s.orders.filter((o) => o.status === "CANCELLED").length;
    byWaiter.set(key, cur);
  }

  return Array.from(byWaiter.values()).map((w) => ({
    "Waiter": w.waiterName,
    "Tables Served": w.tablesServed,
    "Covers": w.covers,
    "Dine-In Sales (GHS)": roundMoney(w.sales),
    "Avg Check (GHS)":
      w.covers > 0 ? roundMoney(w.sales / w.covers) : 0,
    "Avg Turn (min)":
      w.tablesServed > 0
        ? Math.round(w.durationTotal / w.tablesServed / 60000)
        : 0,
    "Void/Cancel Count": w.voidCount,
  }));
}

export async function fetchSectionPerformance(input: {
  branchId?: string;
  startDate: Date;
  endDate: Date;
}) {
  const rows = await fetchClosedTableSessions(input);
  const bySection = new Map<
    string,
    { covers: number; revenue: number; sessions: number; durationTotal: number }
  >();

  for (const r of rows) {
    const cur = bySection.get(r.sectionName) ?? {
      covers: 0,
      revenue: 0,
      sessions: 0,
      durationTotal: 0,
    };
    cur.covers += r.covers;
    cur.revenue += r.revenue;
    cur.sessions += 1;
    cur.durationTotal += r.durationMinutes;
    bySection.set(r.sectionName, cur);
  }

  return Array.from(bySection.entries()).map(([section, v]) => ({
    Section: section,
    Sessions: v.sessions,
    Covers: v.covers,
    "Revenue (GHS)": roundMoney(v.revenue),
    "Revenue per Cover (GHS)":
      v.covers > 0 ? roundMoney(v.revenue / v.covers) : 0,
    "Avg Turn (min)":
      v.sessions > 0 ? Math.round(v.durationTotal / v.sessions) : 0,
  }));
}
