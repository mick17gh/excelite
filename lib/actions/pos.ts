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
import { requireTableForDineIn } from "@/lib/features/table-management";
import { markTableOrdering } from "@/lib/actions/tables";
import { validateTableSessionForOrder } from "@/lib/features/table-session-validation";
import { closeTableSessionIfAllOrdersPaid } from "@/lib/features/table-session-lifecycle";

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

    const tableModuleOn = await requireTableForDineIn(branch.organizationId);
    if (tableModuleOn && input.type === "DINE_IN" && !input.tableSessionId) {
      return {
        success: false,
        error: "Select and seat a table before placing a dine-in order",
      };
    }

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
        cashierId: input.cashierId || null,
        assignedBy,
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
  paymentMethod: string;
  amountReceived: number;
  tip?: number;
  createSale?: boolean; // Create a sale record for reporting
  skipStatusComplete?: boolean; // When true, leave order IN_PROGRESS so kitchen drives it to COMPLETED
}

export async function completeOrder(input: CompleteOrderInput) {
  try {
    // Get the order with items
    const order = await db.order.findUnique({
      where: { id: input.orderId },
      include: {
        items: {
          include: {
            menuItem: true,
            selections: { select: { menuItemOptionId: true } },
          },
        },
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.status !== "COMPLETED" && order.paymentStatus !== "PAID") {
      const { assertCartStockAvailable } = await import(
        "@/lib/services/menu-stock-availability"
      );
      const stockCheck = await assertCartStockAvailable(
        order.branchId,
        order.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          menuItemOptionIds: item.selections?.map((s) => s.menuItemOptionId) || [],
          menuItemName: item.menuItem?.name,
        }))
      );
      if (!stockCheck.ok) {
        return { success: false, error: stockCheck.error };
      }
    }

    // Idempotent replay (e.g. offline sync retry): order already finalized
    if (order.status === "COMPLETED" || order.paymentStatus === "PAID") {
      if (order.tableSessionId) {
        await closeTableSessionIfAllOrdersPaid(
          order.tableSessionId,
          order.branchId,
        );
      }
      const totalWithTip = Number(order.total) + (input.tip || 0);
      const change = input.amountReceived - totalWithTip;
      return {
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          total: Number(order.total),
          tip: input.tip || 0,
          totalWithTip,
          amountReceived: input.amountReceived,
          change: Math.max(0, change),
          paymentMethod: order.paymentMethod || input.paymentMethod,
          saleId: null,
        },
      };
    }

    // Update order status and payment
    // If skipStatusComplete (kitchen toggle on), leave as IN_PROGRESS so kitchen drives COMPLETED
    const orderStatus = input.skipStatusComplete ? "IN_PROGRESS" : "COMPLETED";
    await db.order.update({
      where: { id: input.orderId },
      data: {
        status: orderStatus,
        paymentMethod: input.paymentMethod,
        paymentStatus: "PAID",
        ...(orderStatus === "COMPLETED" ? { closedAt: new Date() } : {}),
      },
    });

    if (order.tableSessionId) {
      await closeTableSessionIfAllOrdersPaid(order.tableSessionId, order.branchId);
    }

    // Create Payment record
    const paymentRef = `PAY-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    await db.payment.create({
      data: {
        orderId: order.id,
        reference: paymentRef,
        amount: Number(order.total) + (input.tip || 0),
        status: "PAID",
        provider: "pos",
        paidAt: new Date(),
      },
    });

    // Create sale record if requested
    let saleId: string | null = null;
    if (input.createSale !== false) {
      const saleNumber = `SALE-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      const hour = new Date().getHours();
      let dayPart: "BREAKFAST" | "LUNCH" | "DINNER" | "LATE_NIGHT" = "LATE_NIGHT";
      if (hour >= 6 && hour < 11) dayPart = "BREAKFAST";
      else if (hour >= 11 && hour < 15) dayPart = "LUNCH";
      else if (hour >= 15 && hour < 21) dayPart = "DINNER";

      // Map OrderType to SalesChannel for sale record
      const channelMap: Record<string, SalesChannel> = {
        DINE_IN: "DINE_IN",
        TAKEOUT: "TAKEOUT",
        DELIVERY: "DELIVERY",
        APP: "APP",
      };
      const channel = channelMap[order.type] || "DINE_IN";

      const transactionRef = `TXN-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const transaction = await db.transaction.create({
        data: {
          transactionRef,
          branchId: order.branchId,
          staffId: order.cashierId,
          paymentMethod: input.paymentMethod,
          amount: Number(order.total) + (input.tip || 0),
          tip: input.tip || 0,
          transactionDate: new Date(),
        },
      });

      const allOptionIds = order.items.flatMap((i) =>
        i.selections?.map((s) => s.menuItemOptionId) || []
      );
      const optionRows = allOptionIds.length
        ? await db.menuItemOption.findMany({
            where: { id: { in: allOptionIds } },
            select: { id: true, costDelta: true },
          })
        : [];
      const optCostDelta = new Map(
        optionRows.map((o) => [o.id, o.costDelta != null ? Number(o.costDelta) : 0])
      );

      const sale = await db.sale.create({
        data: {
          saleNumber,
          branchId: order.branchId,
          transactionId: transaction.id,
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
          channel,
          dayPart,
          customerCount: 1,
          saleDate: new Date(),
          items: {
            create: order.items.map((item) => {
              const oids = item.selections?.map((s) => s.menuItemOptionId) || [];
              const optionCostSum = oids.reduce((s, id) => s + (optCostDelta.get(id) || 0), 0);
              const unitCost =
                Math.round(((item.menuItem?.cost ? Number(item.menuItem.cost) : 0) + optionCostSum) * 100) / 100;
              return {
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                unitCost,
                total: item.lineTotal,
                discount: 0,
                configurationLabel: item.configurationLabel,
                configurationKey: item.configurationKey,
                selections:
                  oids.length > 0
                    ? { create: oids.map((menuItemOptionId) => ({ menuItemOptionId })) }
                    : undefined,
              };
            }),
          },
        },
      });
      saleId = sale.id;

      await logCreate(
        "Sale",
        sale.id,
        {
          saleNumber,
          orderId: order.id,
          branchId: order.branchId,
          total: Number(order.total),
          paymentMethod: input.paymentMethod,
        }
      );

      // Deduct branch inventory based on recipes (non-blocking)
      try {
        await deductInventoryForSale(
          order.items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            menuItemOptionIds: item.selections?.map((s) => s.menuItemOptionId) || [],
          })),
          order.branchId,
          order.id
        );
      } catch (err) {
        console.warn("[completeOrder] Inventory deduction failed:", err);
      }
    }

    const totalWithTip = Number(order.total) + (input.tip || 0);
    const change = input.amountReceived - totalWithTip;

    // Auto-send SMS payment receipt if customer has name and phone
    try {
      await sendPaymentReceiptSMS(order.id);
    } catch (err) {
      console.warn("[completeOrder] Failed to send payment receipt SMS:", err);
    }

    // Auto-create delivery request for DELIVERY orders
    if (order.type === "DELIVERY") {
      try {
        await createDeliveryRequest({
          orderId: order.id,
          deliveryAddress: order.deliveryAddress || undefined,
          deliveryPhone: order.deliveryPhone || undefined,
          customerName: order.customerName || undefined,
          fee: Number(order.deliveryFee) || 0,
          notes: order.deliveryNotes || undefined,
        });
      } catch (err) {
        console.warn("[completeOrder] Failed to create delivery request:", err);
      }
    }

    revalidatePath("/pos");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/delivery");

    return {
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: Number(order.total),
        tip: input.tip || 0,
        totalWithTip,
        amountReceived: input.amountReceived,
        change: Math.max(0, change),
        paymentMethod: input.paymentMethod,
        saleId,
      },
    };
  } catch (error) {
    console.error("[completeOrder] Error:", error);
    return { success: false, error: "Failed to complete order" };
  }
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

    // Cancel associated kitchen tickets
    await db.kitchenTicket.updateMany({
      where: { orderId },
      data: { status: "CANCELLED" },
    });

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

