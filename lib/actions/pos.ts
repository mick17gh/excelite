"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { OrderStatus, OrderType, SalesChannel } from "@/lib/generated/prisma/client";
import { logCreate } from "@/lib/services/audit";
import { createDeliveryRequest } from "@/lib/actions/delivery";
import { sendPaymentReceiptSMS } from "@/lib/services/sms-notifications";
import { deductInventoryForSale } from "@/lib/services/inventory-deduction";
import {
  applyDefaultMenuItemSelections,
  resolveMenuItemSelections,
} from "@/lib/menu-selections";
import { filterOrderItemsForKitchenStation } from "@/lib/kitchen/category-routing";
import { getKitchenEligibleOrderItems } from "@/lib/kitchen/ticket-items";
import { computeOrderTaxAmounts } from "@/lib/services/tax-calculation";
import { requireTableForDineInAtBranch } from "@/lib/features/table-management";
import { markTableOrdering } from "@/lib/actions/tables";
import { validateTableSessionForOrder } from "@/lib/features/table-session-validation";
import { closeTableSessionIfAllOrdersPaid } from "@/lib/features/table-session-lifecycle";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  settleOrderWithTenders,
  type SettleOrderResult,
} from "@/lib/payments/settle-order";
import type { PaymentTender } from "@/lib/payments/tenders";
import { normalizePaymentMethod } from "@/lib/payments/tenders";

// Helper to serialize Decimal fields from Prisma order objects for client components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializePosOrder(order: Record<string, any>) {
  const plain = JSON.parse(JSON.stringify(order));
  return {
    ...plain,
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    discount: Number(order.discount),
    deliveryFee: Number(order.deliveryFee),
    total: Number(order.total),
    deliveryLat: order.deliveryLat ? Number(order.deliveryLat) : null,
    deliveryLng: order.deliveryLng ? Number(order.deliveryLng) : null,
    taxInclusive: order.branch?.taxInclusive ?? false,
    showTaxOnReceipt: order.branch?.showTaxOnReceipt ?? true,
    taxNumber: order.branch?.taxNumber ?? null,
    showTaxNumberOnReceipt: order.branch?.showTaxNumberOnReceipt ?? false,
    taxName: order.branch?.taxName ?? "VAT",
    taxRate: order.branch?.taxRate != null ? Number(order.branch.taxRate) : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: order.items?.map((item: Record<string, any>) => ({
      ...JSON.parse(JSON.stringify(item)),
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
      menuItemOptionIds:
        item.selections?.map((s: { menuItemOptionId: string }) => s.menuItemOptionId) ?? [],
      menuItem: item.menuItem ? {
        ...JSON.parse(JSON.stringify(item.menuItem)),
        price: Number(item.menuItem.price),
        cost: item.menuItem.cost ? Number(item.menuItem.cost) : 0,
      } : null,
    })) || [],
    branch: order.branch ? {
      ...JSON.parse(JSON.stringify(order.branch)),
      taxRate: Number(order.branch.taxRate),
      taxInclusive: order.branch.taxInclusive ?? false,
      showTaxOnReceipt: order.branch.showTaxOnReceipt ?? true,
      taxNumber: order.branch.taxNumber ?? null,
      showTaxNumberOnReceipt: order.branch.showTaxNumberOnReceipt ?? false,
      taxName: order.branch.taxName,
      taxEnabled: order.branch.taxEnabled ?? true,
      latitude: order.branch.latitude ? Number(order.branch.latitude) : null,
      longitude: order.branch.longitude ? Number(order.branch.longitude) : null,
    } : undefined,
  };
}

function generateOrderNumber(): string {
  const prefix = "POS";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

/** Order.cashierId is a User id; Transaction.staffId must reference Staff. */
async function resolveTransactionStaffId(
  cashierUserId: string | null | undefined,
  branchId: string,
): Promise<string | null> {
  if (!cashierUserId) return null;

  const existingStaff = await db.staff.findFirst({
    where: { id: cashierUserId, branchId, deletedAt: null },
    select: { id: true },
  });
  if (existingStaff) return existingStaff.id;

  const cashierUser = await db.user.findUnique({
    where: { id: cashierUserId },
    select: { email: true },
  });
  if (!cashierUser?.email) return null;

  const staffByEmail = await db.staff.findFirst({
    where: {
      branchId,
      email: cashierUser.email,
      deletedAt: null,
      isActive: true,
    },
    select: { id: true },
  });
  return staffByEmail?.id ?? null;
}

export interface CreatePosOrderItemInput {
  menuItemId: string;
  quantity: number;
  /** Client hint; server recomputes from menuItemOptionIds + catalog */
  unitPrice?: number;
  notes?: string;
  menuItemOptionIds?: string[];
}

export interface CreatePosOrderInput {
  branchId: string;
  cashierId?: string;
  customerId?: string;
  type: OrderType;
  items: CreatePosOrderItemInput[];
  paymentMethod?: string;
  customerName?: string;
  notes?: string;
  discount?: number;
  deliveryFee?: number;
  deliveryAddress?: string;
  deliveryPhone?: string;
  deliveryNotes?: string;
  sendToKitchen?: boolean; // Automatically create kitchen ticket
  stationId?: string; // Specific kitchen station (optional)
  /** When replaying offline POS sync, prevents duplicate Order rows */
  offlineClientMutationId?: string;
  tableSessionId?: string;
  assignedBy?: string;
}

export async function createPosOrder(input: CreatePosOrderInput) {
  try {
    const branch = await db.branch.findUnique({
      where: { id: input.branchId },
      select: { organizationId: true },
    });
    if (!branch?.organizationId) {
      return { success: false, error: "Branch not found" };
    }

    const tableModuleOn = await requireTableForDineInAtBranch(input.branchId);
    if (tableModuleOn && input.type === "DINE_IN" && !input.tableSessionId) {
      return {
        success: false,
        error: "Select and seat a table before placing a dine-in order",
      };
    }

    const session = await auth.api.getSession({ headers: await headers() });
    const currentUserId = session?.user?.id ?? null;

    let tableSessionId: string | null = input.tableSessionId ?? null;
    let assignedBy: string | null = input.assignedBy ?? null;

    const menuItemIds = [...new Set(input.items.map((i) => i.menuItemId))];
    const { assertMenuItemsVisibleAtBranch } = await import(
      "@/lib/menu/branch-availability"
    );
    const visibilityCheck = await assertMenuItemsVisibleAtBranch(
      menuItemIds,
      input.branchId
    );
    if (!visibilityCheck.ok) {
      return { success: false, error: visibilityCheck.error };
    }

    if (tableSessionId) {
      const check = await validateTableSessionForOrder(
        tableSessionId,
        input.branchId,
      );
      if ("error" in check) {
        return { success: false, error: check.error };
      }
      tableSessionId = check.sessionId;
      const session = await db.tableSession.findUnique({
        where: { id: tableSessionId },
        select: { openedByUserId: true, tableId: true },
      });
      if (session) {
        assignedBy = assignedBy ?? session.openedByUserId;
        await markTableOrdering(session.tableId);
      }
    }

    if (input.offlineClientMutationId) {
      const existingOrder = await db.order.findFirst({
        where: { offlineClientMutationId: input.offlineClientMutationId },
        include: {
          items: { include: { menuItem: true, selections: { select: { menuItemOptionId: true } } } },
          branch: true,
          cashier: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      if (existingOrder) {
        return { success: true, data: serializePosOrder(existingOrder) };
      }
    }

    const orderNumber = generateOrderNumber();
    
    // Fetch branch tax settings
    const branchTax = await db.branch.findUnique({
      where: { id: input.branchId },
      select: {
        taxRate: true,
        taxName: true,
        taxEnabled: true,
        taxInclusive: true,
        showTaxOnReceipt: true,
        taxNumber: true,
        showTaxNumberOnReceipt: true,
      },
    });

    const resolvedLines: {
      menuItemId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      notes?: string;
      configurationLabel: string | null;
      configurationKey: string | null;
      optionIds: string[];
    }[] = [];

    for (const it of input.items) {
      const withDefaults = await applyDefaultMenuItemSelections(
        it.menuItemId,
        it.menuItemOptionIds
      );
      const resolved = await resolveMenuItemSelections(it.menuItemId, withDefaults);
      if (!resolved.ok) {
        return { success: false, error: resolved.error };
      }
      const quantity = it.quantity || 1;
      const unitPrice = resolved.data.unitPrice;
      const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
      resolvedLines.push({
        menuItemId: it.menuItemId,
        quantity,
        unitPrice,
        lineTotal,
        notes: it.notes,
        configurationLabel: resolved.data.configurationLabel || null,
        configurationKey: resolved.data.configurationKey || null,
        optionIds: resolved.data.resolvedOptionIds,
      });
    }

    const menuItemsForStock = await db.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      select: { id: true, name: true },
    });
    const menuNameMap = new Map(menuItemsForStock.map((m) => [m.id, m.name]));

    const { assertCartStockAvailable } = await import(
      "@/lib/services/menu-stock-availability"
    );
    const stockCheck = await assertCartStockAvailable(
      input.branchId,
      resolvedLines.map((l) => ({
        menuItemId: l.menuItemId,
        quantity: l.quantity,
        menuItemOptionIds: l.optionIds,
        menuItemName: menuNameMap.get(l.menuItemId),
      }))
    );
    if (!stockCheck.ok) {
      return { success: false, error: stockCheck.error };
    }

    const lineTotal = resolvedLines.reduce((s, l) => s + l.lineTotal, 0);
    const discount = input.discount || 0;
    const deliveryFee = input.deliveryFee || 0;
    const { subtotal, tax, total } = computeOrderTaxAmounts({
      lineTotal,
      discount,
      deliveryFee,
      ratePercent: Number(branchTax?.taxRate ?? 12.5),
      enabled: branchTax?.taxEnabled ?? true,
      inclusive: branchTax?.taxInclusive ?? false,
    });

    // Create unified Order record with source: POS
    const order = await db.order.create({
      data: {
        orderNumber,
        branchId: input.branchId,
        cashierId: input.cashierId || currentUserId,
        assignedBy: assignedBy ?? currentUserId,
        tableSessionId,
        customerId: input.customerId || null,
        customerName: input.customerName || null,
        source: "POS",
        type: input.type,
        status: "NEW",
        subtotal,
        tax,
        discount,
        deliveryFee,
        total,
        paymentMethod: input.paymentMethod || null,
        paymentStatus: "PENDING",
        notes: input.notes || null,
        deliveryAddress: input.deliveryAddress || null,
        deliveryPhone: input.deliveryPhone || null,
        deliveryNotes: input.deliveryNotes || null,
        offlineClientMutationId: input.offlineClientMutationId || null,
        items: {
          create: resolvedLines.map((it) => ({
            menuItemId: it.menuItemId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            lineTotal: it.lineTotal,
            notes: it.notes,
            configurationLabel: it.configurationLabel,
            configurationKey: it.configurationKey,
            selections:
              it.optionIds.length > 0
                ? {
                    create: it.optionIds.map((menuItemOptionId) => ({ menuItemOptionId })),
                  }
                : undefined,
          })),
        },
      },
      include: {
        items: {
          include: {
            menuItem: { include: { category: { select: { name: true } } } },
            selections: { select: { menuItemOptionId: true } },
          },
        },
        branch: true,
        cashier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create kitchen ticket if requested
    let kitchenTicketId: string | null = null;
    if (input.sendToKitchen) {
      try {
        let stationId = input.stationId;
        let stationCategories: string | null = null;
        if (!stationId) {
          const defaultStation = await db.kitchenStation.findFirst({
            where: { branchId: input.branchId, isActive: true },
          });
          stationId = defaultStation?.id;
          stationCategories = defaultStation?.categories ?? null;
        } else {
          const station = await db.kitchenStation.findUnique({
            where: { id: stationId },
            select: { categories: true },
          });
          stationCategories = station?.categories ?? null;
        }

        if (stationId) {
          const kitchenItems = filterOrderItemsForKitchenStation(order.items, stationCategories);
          if (kitchenItems.length > 0) {
            const kitchenTicket = await db.kitchenTicket.create({
              data: {
                orderId: order.id,
                stationId,
                status: "NEW",
                items: {
                  create: kitchenItems.map((item) => ({
                    orderItemId: item.id,
                    status: "NEW",
                  })),
                },
              },
            });
            kitchenTicketId = kitchenTicket.id;
          }
        }
      } catch (error) {
        console.warn("[createPosOrder] Failed to create kitchen ticket:", error);
      }
    }

    // Create audit log
    await logCreate(
      "Order",
      order.id,
      {
        orderNumber,
        branchId: input.branchId,
        total,
        itemCount: input.items.length,
        source: "POS",
        type: input.type,
        kitchenTicketId,
      }
    );

    revalidatePath("/pos");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    revalidatePath("/kitchen");

    return { success: true, data: serializePosOrder(order) };
  } catch (error) {
    console.error("[createPosOrder] Error:", error);
    return { success: false, error: "Failed to create POS order" };
  }
}

export async function listPosOrders(branchId?: string, status?: OrderStatus) {
  try {
    const orders = await db.order.findMany({
      where: {
        source: "POS",
        ...(branchId && { branchId }),
        ...(status && { status }),
      },
      include: {
        items: {
          include: {
            menuItem: true,
            selections: { select: { menuItemOptionId: true } },
          },
        },
        branch: true,
      },
      orderBy: { openedAt: "desc" },
      take: 50,
    });

    return { success: true, data: orders.map(o => serializePosOrder(o)) };
  } catch (error) {
    console.error("[listPosOrders] Error:", error);
    return { success: false, error: "Failed to fetch POS orders", data: [] };
  }
}

export async function updatePosOrderStatus(orderId: string, status: OrderStatus) {
  try {
    const order = await db.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === "COMPLETED" ? { closedAt: new Date() } : {}),
      },
    });

    revalidatePath("/pos");
    revalidatePath("/dashboard/orders");
    revalidatePath("/kitchen");

    return { success: true, data: serializePosOrder(order) };
  } catch (error) {
    console.error("[updatePosOrderStatus] Error:", error);
    return { success: false, error: "Failed to update order status" };
  }
}

export interface CompleteOrderInput {
  orderId: string;
  paymentMethod?: string;
  amountReceived: number;
  tip?: number;
  createSale?: boolean;
  skipStatusComplete?: boolean;
  tenders?: PaymentTender[];
}

export async function completeOrder(
  input: CompleteOrderInput,
): Promise<
  { success: true; data: SettleOrderResult } | { success: false; error: string }
> {
  let tenders = input.tenders;
  if (!tenders?.length) {
    const order = await db.order.findUnique({
      where: { id: input.orderId },
      select: { total: true },
    });
    if (!order) return { success: false, error: "Order not found" };

    const tip = input.tip ?? 0;
    const expected = Math.round((Number(order.total) + tip) * 100) / 100;
    const isComplimentary = input.paymentMethod === "COMPLIMENTARY";
    const method = isComplimentary
      ? "COMPLIMENTARY"
      : normalizePaymentMethod(input.paymentMethod || "CASH") || "CASH";
    tenders = [
      {
        method,
        amount: expected,
        amountReceived: method === "CASH" ? input.amountReceived : undefined,
      },
    ];
  }
  const result = await settleOrderWithTenders({
    orderId: input.orderId,
    tenders,
    tip: input.tip,
    createSale: input.createSale,
    skipStatusComplete: input.skipStatusComplete,
    paymentProvider: "pos",
  });

  if (!result.success) return result;

  revalidatePath("/pos");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/delivery");

  return result;
}

// Send order items to kitchen (used from POS UI)
export interface CompleteComplimentaryOrderInput {
  orderId: string;
  reason: string;
  createSale?: boolean;
}

/** CEO/management complimentary — $0 payment, full audit, inventory still deducts via sale. */
export async function completeComplimentaryOrder(input: CompleteComplimentaryOrderInput) {
  try {
    const { headers: getHeaders } = await import("next/headers");
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: await getHeaders() });
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const dbUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });
    if (dbUser?.organizationId) {
      const allowed = await canAuthorizeComplimentary(
        (session.user.role as string) || "STAFF",
        dbUser.organizationId,
      );
      if (!allowed) {
        return { success: false, error: "You are not allowed to authorize complimentary orders" };
      }
    }

    await db.order.update({
      where: { id: input.orderId },
      data: {
        isComplimentary: true,
        complimentaryAuthorizedBy: session.user.id,
        complimentaryReason: input.reason,
        complimentaryAuthorizedAt: new Date(),
        subtotal: 0,
        tax: 0,
        discount: 0,
        deliveryFee: 0,
        total: 0,
      },
    });

    const result = await completeOrder({
      orderId: input.orderId,
      paymentMethod: "COMPLIMENTARY",
      amountReceived: 0,
      tip: 0,
      createSale: input.createSale !== false,
    });

    revalidatePath("/pos");
    revalidatePath("/dashboard/orders");
    return result;
  } catch (error) {
    console.error("[completeComplimentaryOrder]", error);
    return { success: false, error: "Failed to complete complimentary order" };
  }
}

export async function canAuthorizeComplimentary(userRole: string, organizationId: string) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { complimentaryApproverRoles: true },
  });
  const defaults = ["EXECUTIVE", "ADMIN", "SUPER_ADMIN"];
  const roles = (org?.complimentaryApproverRoles as string[] | null) || defaults;
  return roles.includes(userRole);
}

export async function sendToKitchen(orderId: string, itemIds?: string[], stationId?: string) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        branch: true,
        items: {
          include: { menuItem: { include: { category: { select: { name: true } } } } },
        },
      },
    });

    if (!order) return { success: false, error: "Order not found" };

    let targetStationId = stationId;
    if (!targetStationId) {
      const defaultStation = await db.kitchenStation.findFirst({
        where: { branchId: order.branchId, isActive: true },
      });
      targetStationId = defaultStation?.id;
    }

    if (!targetStationId) return { success: false, error: "No kitchen station found" };

    const eligible = await getKitchenEligibleOrderItems(orderId, targetStationId);
    if (!eligible.ok) {
      return { success: false, error: eligible.error };
    }

    const itemsToSend = itemIds
      ? eligible.items.filter((item) => itemIds.includes(item.id))
      : eligible.items;

    if (itemsToSend.length === 0) {
      return { success: false, error: "No items to send for this kitchen station" };
    }

    const kitchenTicket = await db.kitchenTicket.create({
      data: {
        orderId: order.id,
        stationId: targetStationId,
        status: "NEW",
        items: {
          create: itemsToSend.map((item) => ({ orderItemId: item.id, status: "NEW" })),
        },
      },
    });

    revalidatePath("/pos");
    revalidatePath("/kitchen");

    return {
      success: true,
      data: { ticketId: kitchenTicket.id, orderId: order.id, orderNumber: order.orderNumber, stationId: targetStationId, itemCount: itemsToSend.length },
    };
  } catch (error) {
    console.error("[sendToKitchen] Error:", error);
    return { success: false, error: "Failed to send order to kitchen" };
  }
}

// Get available kitchen stations for a branch
export async function getKitchenStations(branchId: string) {
  try {
    const stations = await db.kitchenStation.findMany({
      where: {
        branchId,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    return { success: true, data: stations };
  } catch (error) {
    console.error("[getKitchenStations] Error:", error);
    return { success: false, error: "Failed to fetch stations", data: [] };
  }
}

// Cancel/void a POS order
export async function voidPosOrder(orderId: string, reason: string) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.status === "COMPLETED") {
      return { success: false, error: "Cannot void a completed order" };
    }

    await db.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        notes: `${order.notes || ""}\n[VOIDED] ${reason}`.trim(),
      },
    });

    const { cancelKitchenTicketsForOrder } = await import("@/lib/kitchen/cancel-tickets");
    await cancelKitchenTicketsForOrder(orderId);

    // Create audit log
    await logCreate(
      "PosOrderVoid",
      orderId,
      {
        orderNumber: order.orderNumber,
        reason,
        total: Number(order.total),
      }
    );

    revalidatePath("/pos");
    revalidatePath("/kitchen");

    return { success: true };
  } catch (error) {
    console.error("[voidPosOrder] Error:", error);
    return { success: false, error: "Failed to void order" };
  }
}

