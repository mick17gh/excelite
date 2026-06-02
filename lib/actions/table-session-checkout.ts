"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Role } from "@/lib/generated/prisma/client";
import type { Permission } from "@/lib/permissions/types";
import { getEffectivePermissions, hasPermissionInList } from "@/lib/permissions/resolver";
import { resolveOrganizationIdForSession } from "@/lib/permissions/require";
import { isTableManagementEnabledForBranch } from "@/lib/features/table-management";
import { closeTableSessionIfAllOrdersPaid } from "@/lib/features/table-session-lifecycle";
import { completeOrder } from "@/lib/actions/pos";

type CheckoutActor = {
  userId: string;
  role: Role;
  permissions: Permission[];
};

function actorCan(actor: CheckoutActor, permission: Permission) {
  return hasPermissionInList(actor.permissions, permission);
}

async function getActor(): Promise<CheckoutActor | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;
  const organizationId = await resolveOrganizationIdForSession(session.user.id);
  if (!organizationId) return null;
  const role = session.user.role as Role;
  const permissions = await getEffectivePermissions(organizationId, role);
  return { userId: session.user.id, role, permissions };
}

export async function getTableSessionCheckout(sessionId: string) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "tables:view")) {
    return { error: "Forbidden" };
  }
  if (!actorCan(actor, "transactions:create")) {
    return { error: "Forbidden" };
  }

  const session = await db.tableSession.findUnique({
    where: { id: sessionId },
    include: {
      table: { select: { id: true, label: true, branchId: true } },
      opener: { select: { name: true } },
      orders: {
        where: { paymentStatus: { not: "PAID" } },
        select: {
          id: true,
          orderNumber: true,
          subtotal: true,
          tax: true,
          total: true,
          paymentStatus: true,
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session || session.status !== "OPEN") {
    return { error: "Session not found or already closed" };
  }

  const enabled = await isTableManagementEnabledForBranch(session.branchId);
  if (!enabled) return { error: "Table management is not enabled" };

  const unpaidOrders = session.orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    subtotal: Number(o.subtotal),
    tax: Number(o.tax),
    total: Number(o.total),
    paymentStatus: o.paymentStatus,
    itemCount: o._count.items,
  }));

  const unpaidSubtotal = unpaidOrders.reduce((s, o) => s + o.subtotal, 0);
  const unpaidTax = unpaidOrders.reduce((s, o) => s + o.tax, 0);
  const unpaidTotal = unpaidOrders.reduce((s, o) => s + o.total, 0);

  return {
    data: {
      sessionId: session.id,
      tableId: session.table.id,
      tableLabel: session.table.label,
      branchId: session.branchId,
      guestCount: session.guestCount,
      openedByName: session.opener.name,
      unpaidSubtotal: Math.round(unpaidSubtotal * 100) / 100,
      unpaidTax: Math.round(unpaidTax * 100) / 100,
      unpaidTotal: Math.round(unpaidTotal * 100) / 100,
      orders: unpaidOrders,
    },
  };
}

export async function settleTableSession(input: {
  sessionId: string;
  paymentMethod: string;
  amountReceived?: number;
  tip?: number;
}) {
  const actor = await getActor();
  if (!actor || !actorCan(actor, "transactions:create")) {
    return { error: "Forbidden" };
  }

  const session = await db.tableSession.findUnique({
    where: { id: input.sessionId },
    include: {
      table: { select: { label: true } },
    },
  });

  if (!session || session.status !== "OPEN") {
    return { error: "Session not found or already closed" };
  }

  const enabled = await isTableManagementEnabledForBranch(session.branchId);
  if (!enabled) return { error: "Table management is not enabled" };

  const unpaidOrders = await db.order.findMany({
    where: {
      tableSessionId: session.id,
      paymentStatus: { not: "PAID" },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, orderNumber: true, total: true },
  });

  if (unpaidOrders.length === 0) {
    return { error: "No unpaid checks on this tab" };
  }

  const tabTotal =
    Math.round(unpaidOrders.reduce((s, o) => s + Number(o.total), 0) * 100) / 100;
  const tip = input.tip ?? 0;
  const amountReceived = input.amountReceived ?? tabTotal + tip;

  const paidOrderIds: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < unpaidOrders.length; i++) {
    const order = unpaidOrders[i];
    const isLast = i === unpaidOrders.length - 1;
    const orderTotal = Number(order.total);
    const orderTip = isLast ? tip : 0;
    const orderAmountReceived = isLast ? amountReceived : orderTotal + orderTip;

    const result = await completeOrder({
      orderId: order.id,
      paymentMethod: input.paymentMethod,
      amountReceived: orderAmountReceived,
      tip: orderTip,
      createSale: true,
      skipStatusComplete: false,
    });

    if (!result.success) {
      errors.push(`${order.orderNumber}: ${result.error || "Payment failed"}`);
      break;
    }
    paidOrderIds.push(order.id);
  }

  if (errors.length > 0) {
    return {
      error:
        paidOrderIds.length > 0
          ? `Partial payment: ${errors.join("; ")}. ${paidOrderIds.length} of ${unpaidOrders.length} checks paid.`
          : errors.join("; "),
      data: paidOrderIds.length > 0 ? { paidOrderIds, partial: true } : undefined,
    };
  }

  await closeTableSessionIfAllOrdersPaid(session.id, session.branchId);

  revalidatePath("/dashboard/tables");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/sales");
  revalidatePath("/pos");
  revalidatePath(`/dashboard/branches/${session.branchId}/tables`);

  const change = Math.max(0, Math.round((amountReceived - tabTotal - tip) * 100) / 100);

  return {
    data: {
      paidOrderIds,
      orderCount: paidOrderIds.length,
      tableLabel: session.table.label,
      tabTotal,
      tip,
      change,
    },
  };
}
