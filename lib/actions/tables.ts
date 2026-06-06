"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  DiningTableStatus,
  TableSessionStatus,
  Role,
} from "@/lib/generated/prisma/client";
import type { Permission } from "@/lib/permissions/types";
import { getEffectivePermissions, hasPermissionInList } from "@/lib/permissions/resolver";
import { resolveOrganizationIdForSession } from "@/lib/permissions/require";
import { isTableManagementEnabledForBranch } from "@/lib/features/table-management";
import { closeTableSessionIfAllOrdersPaid } from "@/lib/features/table-session-lifecycle";

type TableActor = {
  userId: string;
  role: Role;
  branchId: string | null;
  organizationId: string;
  permissions: Permission[];
};

function actorCan(actor: TableActor, permission: Permission) {
  return hasPermissionInList(actor.permissions, permission);
}

async function getActor(): Promise<TableActor | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;
  const organizationId = await resolveOrganizationIdForSession(session.user.id);
  if (!organizationId) return null;
  const role = session.user.role as Role;
  const permissions = await getEffectivePermissions(organizationId, role);
  return {
    userId: session.user.id,
    role,
    branchId: session.user.branchId as string | null,
    organizationId,
    permissions,
  };
}

async function assertTablesEnabled(
  branchId: string,
): Promise<{ error: string } | null> {
  const enabled = await isTableManagementEnabledForBranch(branchId);
  if (!enabled) return { error: "Table management is not enabled" };
  return null;
}

function normalizeCapacity(capacity?: number): number | { error: string } {
  const value = capacity ?? 4;
  if (!Number.isFinite(value) || value < 1 || value > 99) {
    return { error: "Capacity must be between 1 and 99" };
  }
  return Math.round(value);
}

// ─── Sections ───────────────────────────────────────────────────────

export async function getBranchTableSetup(branchId: string) {
  try {
    const actor = await getActor();
    if (!actor || !actorCan(actor, "tables:view")) {
      return { error: "Forbidden" };
    }
    const gate = await assertTablesEnabled(branchId);
    if (gate) return gate;

    const [sections, tables] = await Promise.all([
      db.diningSection.findMany({
        where: { branchId },
        orderBy: { sortOrder: "asc" },
      }),
      db.diningTable.findMany({
        where: { branchId },
        include: {
          section: { select: { id: true, name: true } },
          sessions: {
            where: { status: "OPEN" },
            take: 1,
            include: {
              opener: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ section: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      }),
    ]);

    return {
      data: {
        sections,
        tables: tables.map((t) => ({
          id: t.id,
          branchId: t.branchId,
          sectionId: t.sectionId,
          sectionName: t.section?.name ?? null,
          label: t.label,
          capacity: t.capacity,
          sortOrder: t.sortOrder,
          status: t.status,
          posX: t.posX,
          posY: t.posY,
          isActive: t.isActive,
          openSession: t.sessions[0]
            ? {
                id: t.sessions[0].id,
                guestCount: t.sessions[0].guestCount,
                openedAt: t.sessions[0].openedAt.toISOString(),
                openedByUserId: t.sessions[0].openedByUserId,
                openedByName: t.sessions[0].opener.name,
              }
            : null,
        })),
      },
    };
  } catch (e) {
    console.error("[getBranchTableSetup]", e);
    return { error: "Failed to load tables" };
  }
}

export async function createDiningSection(input: {
  branchId: string;
  name: string;
  sortOrder?: number;
}) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:manage")) {
    return { error: "Forbidden" };
  }
  const gate = await assertTablesEnabled(input.branchId);
  if (gate) return gate;

  const section = await db.diningSection.create({
    data: {
      branchId: input.branchId,
      name: input.name.trim(),
      sortOrder: input.sortOrder ?? 0,
    },
  });
  revalidatePath(`/dashboard/branches/${input.branchId}/tables`);
  return { data: section };
}

export async function updateDiningSection(input: {
  sectionId: string;
  name: string;
  sortOrder?: number;
}) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:manage")) {
    return { error: "Forbidden" };
  }

  const existing = await db.diningSection.findUnique({
    where: { id: input.sectionId },
    select: { id: true, branchId: true },
  });
  if (!existing) return { error: "Section not found" };

  const gate = await assertTablesEnabled(existing.branchId);
  if (gate) return gate;

  const updated = await db.diningSection.update({
    where: { id: input.sectionId },
    data: {
      name: input.name.trim(),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
  revalidatePath(`/dashboard/branches/${existing.branchId}/tables`);
  revalidatePath("/dashboard/tables");
  return { data: updated };
}

export async function deleteDiningSection(sectionId: string) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:manage")) {
    return { error: "Forbidden" };
  }

  const existing = await db.diningSection.findUnique({
    where: { id: sectionId },
    select: { id: true, branchId: true },
  });
  if (!existing) return { error: "Section not found" };

  const gate = await assertTablesEnabled(existing.branchId);
  if (gate) return gate;

  await db.diningTable.updateMany({
    where: { sectionId },
    data: { sectionId: null },
  });
  await db.diningSection.delete({ where: { id: sectionId } });

  revalidatePath(`/dashboard/branches/${existing.branchId}/tables`);
  revalidatePath("/dashboard/tables");
  return { success: true };
}

export async function createDiningTable(input: {
  branchId: string;
  sectionId?: string | null;
  label: string;
  capacity?: number;
}) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:manage")) {
    return { error: "Forbidden" };
  }
  const gate = await assertTablesEnabled(input.branchId);
  if (gate) return gate;

  const capacity = normalizeCapacity(input.capacity);
  if (typeof capacity === "object") return capacity;

  try {
    const table = await db.diningTable.create({
      data: {
        branchId: input.branchId,
        sectionId: input.sectionId || null,
        label: input.label.trim(),
        capacity,
      },
    });
    revalidatePath(`/dashboard/branches/${input.branchId}/tables`);
    revalidatePath("/dashboard/tables");
    return { data: table };
  } catch {
    return { error: "Table label already exists for this branch" };
  }
}

export async function bulkCreateDiningTables(input: {
  branchId: string;
  sectionId?: string | null;
  prefix: string;
  from: number;
  to: number;
  capacity?: number;
}) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:manage")) {
    return { error: "Forbidden" };
  }
  const gate = await assertTablesEnabled(input.branchId);
  if (gate) return gate;

  const { from, to, prefix, branchId, sectionId } = input;
  if (from > to || from < 1) return { error: "Invalid range" };

  const capacity = normalizeCapacity(input.capacity);
  if (typeof capacity === "object") return capacity;

  const rows = [];
  for (let n = from; n <= to; n++) {
    rows.push({
      branchId,
      sectionId: sectionId || null,
      label: `${prefix}${n}`,
      capacity,
      sortOrder: n,
    });
  }

  const result = await db.diningTable.createMany({
    data: rows,
    skipDuplicates: true,
  });
  revalidatePath(`/dashboard/branches/${input.branchId}/tables`);
  return { data: { created: result.count } };
}

export async function updateDiningTableLayout(input: {
  tableId: string;
  posX: number;
  posY: number;
}) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:manage")) {
    return { error: "Forbidden" };
  }
  const table = await db.diningTable.update({
    where: { id: input.tableId },
    data: { posX: input.posX, posY: input.posY },
  });
  revalidatePath("/dashboard/tables");
  return { data: table };
}

export async function updateDiningTable(input: {
  tableId: string;
  label: string;
  capacity: number;
  sectionId?: string | null;
}) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:manage")) {
    return { error: "Forbidden" };
  }

  const existing = await db.diningTable.findUnique({
    where: { id: input.tableId },
    include: { sessions: { where: { status: "OPEN" } } },
  });
  if (!existing) return { error: "Table not found" };

  const gate = await assertTablesEnabled(existing.branchId);
  if (gate) return gate;

  const capacity = normalizeCapacity(input.capacity);
  if (typeof capacity === "object") return capacity;

  if (existing.sessions.length > 0) {
    return { error: "Cannot edit a table with an open session" };
  }

  try {
    const updated = await db.diningTable.update({
      where: { id: input.tableId },
      data: {
        label: input.label.trim(),
        capacity,
        sectionId: input.sectionId ?? null,
      },
    });
    revalidatePath(`/dashboard/branches/${existing.branchId}/tables`);
    revalidatePath("/dashboard/tables");
    return { data: updated };
  } catch {
    return { error: "Table label already exists for this branch" };
  }
}

export async function deleteDiningTable(tableId: string) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:manage")) {
    return { error: "Forbidden" };
  }

  const existing = await db.diningTable.findUnique({
    where: { id: tableId },
    include: { sessions: { where: { status: "OPEN" } } },
  });
  if (!existing) return { error: "Table not found" };

  const gate = await assertTablesEnabled(existing.branchId);
  if (gate) return gate;

  if (existing.sessions.length > 0) {
    return { error: "Cannot delete a table with an open session" };
  }

  await db.tableSession.deleteMany({
    where: { tableId, status: "CLOSED" },
  });
  await db.diningTable.delete({ where: { id: tableId } });

  revalidatePath(`/dashboard/branches/${existing.branchId}/tables`);
  revalidatePath("/dashboard/tables");
  return { success: true };
}

// ─── Sessions & status ──────────────────────────────────────────────

export async function openTableSession(input: {
  tableId: string;
  guestCount: number;
  openedByUserId?: string;
}) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:assign")) {
    return { error: "Forbidden" };
  }

  const table = await db.diningTable.findUnique({
    where: { id: input.tableId },
    include: { sessions: { where: { status: "OPEN" } } },
  });
  if (!table) return { error: "Table not found" };

  const gate = await assertTablesEnabled(table.branchId);
  if (gate) return gate;

  if (table.status === "BLOCKED") return { error: "Table is blocked" };
  if (table.sessions.length > 0) return { error: "Table already has an open check" };
  if (!["AVAILABLE", "DIRTY"].includes(table.status)) {
    return { error: `Cannot seat: table is ${table.status}` };
  }

  const openerId = input.openedByUserId ?? actor.userId;
  const guestCount = Math.max(1, input.guestCount);

  const session = await db.$transaction(async (tx) => {
    const s = await tx.tableSession.create({
      data: {
        branchId: table.branchId,
        tableId: table.id,
        openedByUserId: openerId,
        guestCount,
        status: "OPEN",
      },
      include: {
        table: { select: { label: true } },
        opener: { select: { name: true } },
      },
    });
    await tx.diningTable.update({
      where: { id: table.id },
      data: { status: "SEATED" },
    });
    return s;
  });

  revalidatePath("/pos");
  revalidatePath("/dashboard/tables");
  return {
    data: {
      id: session.id,
      tableId: session.tableId,
      tableLabel: session.table.label,
      guestCount: session.guestCount,
      openedByUserId: session.openedByUserId,
    },
  };
}

export async function setTableBillRequested(tableId: string) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:assign")) {
    return { error: "Forbidden" };
  }
  const table = await db.diningTable.findUnique({ where: { id: tableId } });
  if (!table) return { error: "Table not found" };
  const gate = await assertTablesEnabled(table.branchId);
  if (gate) return gate;

  await db.diningTable.update({
    where: { id: tableId },
    data: { status: "BILL_REQUESTED" },
  });
  revalidatePath("/pos");
  revalidatePath("/dashboard/tables");
  return { success: true };
}

export async function closeTableSession(sessionId: string) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:assign")) {
    return { error: "Forbidden" };
  }

  const session = await db.tableSession.findUnique({
    where: { id: sessionId },
    include: { table: true },
  });
  if (!session || session.status !== "OPEN") {
    return { error: "Session not found or already closed" };
  }

  const gate = await assertTablesEnabled(session.branchId);
  if (gate) return gate;

  await db.$transaction(async (tx) => {
    await tx.tableSession.update({
      where: { id: sessionId },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    await tx.diningTable.update({
      where: { id: session.tableId },
      data: { status: "DIRTY" },
    });
  });

  revalidatePath("/pos");
  revalidatePath("/dashboard/tables");
  return { success: true };
}

export async function clearTable(tableId: string) {
  const actor = await getActor();
  const canClear =
    actor &&
    (actorCan(actor, "tables:manage") ||
      actorCan(actor, "tables:assign"));
  if (!canClear) {
    return { error: "Forbidden" };
  }
  const table = await db.diningTable.findUnique({
    where: { id: tableId },
    include: { sessions: { where: { status: "OPEN" } } },
  });
  if (!table) return { error: "Table not found" };
  if (table.sessions.length > 0) {
    const openSession = table.sessions[0];
    const unpaid = await db.order.count({
      where: {
        tableSessionId: openSession.id,
        paymentStatus: { not: "PAID" },
      },
    });
    if (unpaid > 0) {
      return { error: "Close the open check before clearing the table" };
    }
    await closeTableSessionIfAllOrdersPaid(openSession.id, table.branchId);
    const refreshed = await db.diningTable.findUnique({
      where: { id: tableId },
      include: { sessions: { where: { status: "OPEN" } } },
    });
    if (refreshed && refreshed.sessions.length > 0) {
      return { error: "Could not close the table session" };
    }
  }

  await db.diningTable.update({
    where: { id: tableId },
    data: { status: "AVAILABLE" },
  });
  revalidatePath("/dashboard/tables");
  revalidatePath("/pos");
  revalidatePath(`/dashboard/branches/${table.branchId}/tables`);
  return { success: true };
}

export async function transferTableSession(input: {
  sessionId: string;
  toTableId: string;
}) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:manage")) {
    return { error: "Forbidden" };
  }

  const session = await db.tableSession.findUnique({
    where: { id: input.sessionId },
  });
  if (!session || session.status !== "OPEN") {
    return { error: "Invalid session" };
  }

  const toTable = await db.diningTable.findUnique({
    where: { id: input.toTableId },
    include: { sessions: { where: { status: "OPEN" } } },
  });
  if (!toTable || toTable.branchId !== session.branchId) {
    return { error: "Invalid destination table" };
  }
  if (toTable.sessions.length > 0) {
    return { error: "Destination table is occupied" };
  }

  await db.$transaction(async (tx) => {
    await tx.tableSession.update({
      where: { id: session.id },
      data: { tableId: toTable.id },
    });
    await tx.diningTable.update({
      where: { id: session.tableId },
      data: { status: "AVAILABLE" },
    });
    await tx.diningTable.update({
      where: { id: toTable.id },
      data: { status: "SEATED" },
    });
  });

  revalidatePath("/pos");
  revalidatePath("/dashboard/tables");
  return { success: true };
}

export async function reassignTableSession(input: {
  sessionId: string;
  waiterUserId: string;
}) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:manage")) {
    return { error: "Forbidden" };
  }

  await db.tableSession.update({
    where: { id: input.sessionId },
    data: { openedByUserId: input.waiterUserId },
  });
  revalidatePath("/dashboard/tables");
  return { success: true };
}

export async function setTableBlocked(tableId: string, blocked: boolean) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:manage")) {
    return { error: "Forbidden" };
  }
  await db.diningTable.update({
    where: { id: tableId },
    data: { status: blocked ? "BLOCKED" : "AVAILABLE" },
  });
  revalidatePath("/dashboard/tables");
  return { success: true };
}

export async function listOpenSessions(branchId: string) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:view")) {
    return { error: "Forbidden" };
  }
  const gate = await assertTablesEnabled(branchId);
  if (gate) return gate;

  const sessions = await db.tableSession.findMany({
    where: { branchId, status: "OPEN" },
    include: {
      table: { select: { id: true, label: true, section: { select: { name: true } } } },
      opener: { select: { id: true, name: true } },
      orders: {
        select: { id: true, total: true, paymentStatus: true },
      },
    },
    orderBy: { openedAt: "asc" },
  });

  return {
    data: sessions.map((s) => ({
      id: s.id,
      tableId: s.tableId,
      tableLabel: s.table.label,
      sectionName: s.table.section?.name ?? null,
      openedByUserId: s.openedByUserId,
      openedByName: s.opener.name,
      guestCount: s.guestCount,
      openedAt: s.openedAt.toISOString(),
      unpaidOrders: s.orders.filter((o) => o.paymentStatus !== "PAID").length,
      unpaidTotal: s.orders
        .filter((o) => o.paymentStatus !== "PAID")
        .reduce((sum, o) => sum + Number(o.total), 0),
    })),
  };
}

export async function listBranchWaiters(branchId: string) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:manage")) {
    return { error: "Forbidden" };
  }
  const users = await db.user.findMany({
    where: {
      branchId,
      role: "WAITER",
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return { data: users };
}

export async function mergeTableSessions(input: {
  sourceSessionId: string;
  targetSessionId: string;
}) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:manage")) {
    return { error: "Forbidden" };
  }

  const [source, target] = await Promise.all([
    db.tableSession.findUnique({ where: { id: input.sourceSessionId } }),
    db.tableSession.findUnique({ where: { id: input.targetSessionId } }),
  ]);
  if (!source || !target) return { error: "Session not found" };
  if (source.id === target.id) return { error: "Cannot merge a session into itself" };
  if (source.status !== "OPEN" || target.status !== "OPEN") {
    return { error: "Both sessions must be open" };
  }
  if (source.branchId !== target.branchId) return { error: "Sessions must belong to same branch" };

  await db.$transaction(async (tx) => {
    await tx.order.updateMany({
      where: { tableSessionId: source.id, paymentStatus: { not: "PAID" } },
      data: { tableSessionId: target.id },
    });
    await tx.tableSession.update({
      where: { id: source.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    await tx.diningTable.update({
      where: { id: source.tableId },
      data: { status: "AVAILABLE" },
    });
    await tx.tableSession.update({
      where: { id: target.id },
      data: { guestCount: target.guestCount + source.guestCount },
    });
  });

  revalidatePath("/dashboard/tables");
  revalidatePath("/pos");
  return { success: true };
}

export async function splitTableSession(input: {
  sourceSessionId: string;
  destinationTableId: string;
  movedCovers: number;
}) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:manage")) {
    return { error: "Forbidden" };
  }

  const source = await db.tableSession.findUnique({
    where: { id: input.sourceSessionId },
    include: { table: true },
  });
  if (!source || source.status !== "OPEN") return { error: "Source session not open" };
  if (input.movedCovers < 1 || input.movedCovers >= source.guestCount) {
    return { error: "Moved covers must be between 1 and source covers - 1" };
  }

  const destination = await db.diningTable.findUnique({
    where: { id: input.destinationTableId },
    include: { sessions: { where: { status: "OPEN" } } },
  });
  if (!destination || destination.branchId !== source.branchId) {
    return { error: "Invalid destination table" };
  }
  if (destination.sessions.length > 0) return { error: "Destination table already occupied" };
  if (!["AVAILABLE", "DIRTY"].includes(destination.status)) {
    return { error: "Destination table must be available or dirty" };
  }

  const newSession = await db.$transaction(async (tx) => {
    await tx.tableSession.update({
      where: { id: source.id },
      data: { guestCount: source.guestCount - input.movedCovers },
    });
    const created = await tx.tableSession.create({
      data: {
        branchId: source.branchId,
        tableId: destination.id,
        openedByUserId: source.openedByUserId,
        guestCount: input.movedCovers,
        status: "OPEN",
      },
    });
    await tx.diningTable.update({
      where: { id: destination.id },
      data: { status: "SEATED" },
    });
    return created;
  });

  revalidatePath("/dashboard/tables");
  revalidatePath("/pos");
  return { data: { sessionId: newSession.id } };
}

export async function markTableOrdering(tableId: string) {
  const table = await db.diningTable.findUnique({ where: { id: tableId } });
  if (!table) return;
  if (["SEATED", "ORDERING"].includes(table.status)) {
    await db.diningTable.update({
      where: { id: tableId },
      data: { status: "ORDERING" },
    });
  }
}

export async function getFloorBoardData(branchId: string) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:view")) {
    return { error: "Forbidden" };
  }
  const gate = await assertTablesEnabled(branchId);
  if (gate) return gate;

  const tables = await db.diningTable.findMany({
    where: { branchId, isActive: true },
    include: {
      section: { select: { name: true } },
      sessions: {
        where: { status: "OPEN" },
        include: { opener: { select: { name: true } } },
      },
    },
  });

  const openSessions = tables.filter((t) => t.sessions.length > 0);
  const coversOnFloor = openSessions.reduce(
    (sum, t) => sum + (t.sessions[0]?.guestCount ?? 0),
    0,
  );
  const now = Date.now();
  const avgSeatedMs =
    openSessions.length > 0
      ? openSessions.reduce((sum, t) => {
          const opened = t.sessions[0]?.openedAt.getTime() ?? now;
          return sum + (now - opened);
        }, 0) / openSessions.length
      : 0;

  const statusCounts: Record<DiningTableStatus, number> = {
    AVAILABLE: 0,
    SEATED: 0,
    ORDERING: 0,
    BILL_REQUESTED: 0,
    DIRTY: 0,
    BLOCKED: 0,
  };
  for (const t of tables) {
    statusCounts[t.status] += 1;
  }

  return {
    data: {
      openTables: openSessions.length,
      coversOnFloor,
      avgSeatedMinutes: Math.round(avgSeatedMs / 60000),
      statusCounts,
      tables: tables.map((t) => ({
        id: t.id,
        label: t.label,
        status: t.status,
        sectionName: t.section?.name ?? null,
        capacity: t.capacity,
        posX: t.posX,
        posY: t.posY,
        session: t.sessions[0]
          ? {
              id: t.sessions[0].id,
              guestCount: t.sessions[0].guestCount,
              openedByName: t.sessions[0].opener.name,
              openedAt: t.sessions[0].openedAt.toISOString(),
            }
          : null,
      })),
    },
  };
}

function actorCanUsePosTables(actor: TableActor): boolean {
  return (
    actorCan(actor, "pos:access") ||
    actorCan(actor, "tables:view") ||
    actorCan(actor, "tables:assign")
  );
}

export async function getPosTableContext(branchId: string) {
  const actor = await getActor();
  if (!actor || !actorCanUsePosTables(actor)) {
    return { data: { enabled: false as const } };
  }

  const enabled = await isTableManagementEnabledForBranch(branchId);
  if (!enabled) return { data: { enabled: false as const } };

  const tables = await db.diningTable.findMany({
    where: { branchId },
    include: {
      section: { select: { name: true } },
      sessions: {
        where: { status: "OPEN" },
        take: 1,
        include: {
          opener: { select: { name: true } },
        },
      },
    },
    orderBy: [{ section: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });

  return {
    data: {
      enabled: true as const,
      tables: tables.map((t) => ({
        id: t.id,
        label: t.label,
        status: t.status,
        sectionName: t.section?.name ?? null,
        capacity: t.capacity,
        openSession: t.sessions[0]
          ? {
              id: t.sessions[0].id,
              guestCount: t.sessions[0].guestCount,
              openedByName: t.sessions[0].opener.name,
            }
          : null,
      })),
    },
  };
}
