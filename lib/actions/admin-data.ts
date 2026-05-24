"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@/lib/generated/prisma/client";

async function requirePurgePermission() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: "Unauthorized" as const };
  const role = (session.user.role as Role) || "STAFF";
  if (!hasPermission(role, "transactions:purge")) {
    return { error: "Forbidden" as const };
  }
  return { userId: session.user.id };
}

export interface DataPurgeInput {
  startDate: string;
  endDate: string;
  branchId?: string;
  includeOrders?: boolean;
  includePayments?: boolean;
  includeKitchen?: boolean;
}

function dateRange(start: string, end: string) {
  const gte = new Date(start);
  gte.setHours(0, 0, 0, 0);
  const lte = new Date(end);
  lte.setHours(23, 59, 59, 999);
  return { gte, lte };
}

export async function previewDataPurge(input: DataPurgeInput) {
  const authResult = await requirePurgePermission();
  if ("error" in authResult && authResult.error) {
    return { error: authResult.error };
  }

  const { gte, lte } = dateRange(input.startDate, input.endDate);
  const branchWhere = input.branchId ? { branchId: input.branchId } : {};
  const txWhere = {
    ...branchWhere,
    transactionDate: { gte, lte },
  };
  const saleWhere = {
    ...branchWhere,
    saleDate: { gte, lte },
  };
  const orderWhere = {
    ...branchWhere,
    createdAt: { gte, lte },
  };

  const [
    transactions,
    sales,
    saleItems,
    orders,
    payments,
    kitchenTickets,
  ] = await Promise.all([
    db.transaction.count({ where: txWhere }),
    db.sale.count({ where: saleWhere }),
    db.saleItem.count({ where: { sale: saleWhere } }),
    input.includeOrders ? db.order.count({ where: orderWhere }) : Promise.resolve(0),
    input.includeOrders && input.includePayments
      ? db.payment.count({ where: { order: orderWhere } })
      : Promise.resolve(0),
    input.includeOrders && input.includeKitchen
      ? db.kitchenTicket.count({ where: { order: orderWhere } })
      : Promise.resolve(0),
  ]);

  return {
    data: {
      transactions,
      sales,
      saleItems,
      orders: input.includeOrders ? orders : 0,
      payments: input.includeOrders && input.includePayments ? payments : 0,
      kitchenTickets:
        input.includeOrders && input.includeKitchen ? kitchenTickets : 0,
    },
  };
}

export async function executeDataPurge(
  input: DataPurgeInput & { confirmation: string; reason: string },
) {
  const authResult = await requirePurgePermission();
  if ("error" in authResult && authResult.error) {
    return { error: authResult.error };
  }
  if (input.confirmation !== "DELETE") {
    return { error: 'Type DELETE to confirm' };
  }
  if (!input.reason?.trim()) {
    return { error: "Reason is required" };
  }

  const preview = await previewDataPurge(input);
  if (preview.error) return preview;

  const { gte, lte } = dateRange(input.startDate, input.endDate);
  const branchWhere = input.branchId ? { branchId: input.branchId } : {};
  const txWhere = { ...branchWhere, transactionDate: { gte, lte } };
  const saleWhere = { ...branchWhere, saleDate: { gte, lte } };
  const orderWhere = { ...branchWhere, createdAt: { gte, lte } };

  await db.auditLog.create({
    data: {
      userId: authResult.userId!,
      action: "DELETE",
      entityType: "DataPurge",
      entityId: `${input.startDate}_${input.endDate}`,
      newValues: {
        ...input,
        preview: preview.data,
      },
    },
  });

  const deleted: Record<string, number> = {};

  if (input.includeOrders && input.includeKitchen) {
    deleted.kitchenItem = (
      await db.kitchenItem.deleteMany({
        where: { ticket: { order: orderWhere } },
      })
    ).count;
    deleted.kitchenTicket = (
      await db.kitchenTicket.deleteMany({ where: { order: orderWhere } })
    ).count;
  }

  if (input.includeOrders) {
    deleted.orderNotification = (
      await db.orderNotification.deleteMany({ where: { order: orderWhere } })
    ).count;
    deleted.receipt = (await db.receipt.deleteMany({ where: { order: orderWhere } })).count;
    if (input.includePayments) {
      deleted.payment = (
        await db.payment.deleteMany({ where: { order: orderWhere } })
      ).count;
    }
    deleted.deliveryRequest = (
      await db.deliveryRequest.deleteMany({ where: { order: orderWhere } })
    ).count;
  }

  deleted.saleItemSelection = (
    await db.saleItemSelection.deleteMany({
      where: { saleItem: { sale: saleWhere } },
    })
  ).count;
  deleted.saleItem = (
    await db.saleItem.deleteMany({ where: { sale: saleWhere } })
  ).count;
  deleted.sale = (await db.sale.deleteMany({ where: saleWhere })).count;
  deleted.transaction = (await db.transaction.deleteMany({ where: txWhere })).count;

  if (input.includeOrders) {
    deleted.order = (await db.order.deleteMany({ where: orderWhere })).count;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/orders");

  return { data: { deleted, preview: preview.data } };
}
