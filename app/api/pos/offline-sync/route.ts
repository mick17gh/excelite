import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Role } from "@/lib/generated/prisma/client";
import { auth } from "@/lib/auth";
import { getEffectivePermissions, hasPermissionInList } from "@/lib/permissions/resolver";
import { resolveOrganizationIdForSession } from "@/lib/permissions/require";
import { db } from "@/lib/db";
import { createPosOrder, completeOrder } from "@/lib/actions/pos";
import type { PosOfflineSyncPayload } from "@/lib/offline/pos-types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user.role as Role) || "STAFF";
  const organizationId = await resolveOrganizationIdForSession(session.user.id);
  if (!organizationId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }
  const permissions = await getEffectivePermissions(organizationId, role);
  if (!hasPermissionInList(permissions, "pos:access")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { clientMutationId?: string; payload?: PosOfflineSyncPayload };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { clientMutationId, payload } = body;
  if (!clientMutationId || typeof clientMutationId !== "string") {
    return NextResponse.json({ error: "clientMutationId is required" }, { status: 400 });
  }
  if (!payload?.create || typeof payload.amountReceived !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (payload.create.paymentMethod && payload.create.paymentMethod !== "CASH") {
    return NextResponse.json(
      { error: "Only CASH is allowed for offline POS replay" },
      { status: 400 },
    );
  }

  const existing = await db.posOfflineMutation.findUnique({
    where: { clientMutationId },
  });

  if (existing?.status === "COMPLETED" && existing.resultJson) {
    const r = existing.resultJson as Record<string, unknown>;
    return NextResponse.json({ ok: true, ...r });
  }

  const createInput = {
    ...payload.create,
    cashierId: session.user.id,
    paymentMethod: payload.create.paymentMethod || "CASH",
    offlineClientMutationId: clientMutationId,
  };

  if (existing?.status === "ORDER_CREATED" && existing.orderId) {
    const orderRow = await db.order.findUnique({
      where: { id: existing.orderId },
      select: { orderNumber: true },
    });

    const completeResult = await completeOrder({
      orderId: existing.orderId,
      paymentMethod: createInput.paymentMethod || "CASH",
      amountReceived: payload.amountReceived,
      tip: payload.tip ?? 0,
      createSale: true,
      skipStatusComplete: payload.skipStatusComplete ?? false,
    });

    if (!completeResult.success) {
      return NextResponse.json(
        { error: completeResult.error || "Failed to complete order", orderId: existing.orderId },
        { status: 500 },
      );
    }

    const resultJson = {
      orderId: existing.orderId,
      orderNumber: orderRow?.orderNumber ?? (completeResult.data as { orderNumber?: string })?.orderNumber,
      complete: completeResult.data,
    };

    await db.posOfflineMutation.update({
      where: { clientMutationId },
      data: {
        status: "COMPLETED",
        resultJson,
        errorMessage: null,
      },
    });

    return NextResponse.json({ ok: true, ...resultJson });
  }

  await db.posOfflineMutation.upsert({
    where: { clientMutationId },
    create: {
      clientMutationId,
      status: "PENDING",
      payloadJson: payload as object,
    },
    update: {
      payloadJson: payload as object,
      errorMessage: null,
    },
  });

  const createResult = await createPosOrder(createInput);
  if (!createResult.success || !createResult.data) {
    await db.posOfflineMutation.update({
      where: { clientMutationId },
      data: {
        status: "FAILED",
        errorMessage: createResult.error || "createPosOrder failed",
      },
    });
    return NextResponse.json(
      { error: createResult.error || "Failed to create order" },
      { status: 400 },
    );
  }

  const orderId = createResult.data.id as string;
  const orderNumber = createResult.data.orderNumber as string;

  await db.posOfflineMutation.update({
    where: { clientMutationId },
    data: {
      orderId,
      status: "ORDER_CREATED",
    },
  });

  const completeResult = await completeOrder({
    orderId,
    paymentMethod: createInput.paymentMethod || "CASH",
    amountReceived: payload.amountReceived,
    tip: payload.tip ?? 0,
    createSale: true,
    skipStatusComplete: payload.skipStatusComplete ?? false,
  });

  if (!completeResult.success) {
    return NextResponse.json(
      {
        error: completeResult.error || "Failed to complete order",
        orderId,
        orderNumber,
        partial: true,
      },
      { status: 500 },
    );
  }

  const resultJson = {
    orderId,
    orderNumber,
    complete: completeResult.data,
  };

  await db.posOfflineMutation.update({
    where: { clientMutationId },
    data: {
      status: "COMPLETED",
      resultJson,
      errorMessage: null,
    },
  });

  return NextResponse.json({ ok: true, ...resultJson });
}
