"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { OrderStatus, OrderType, SalesChannel } from "@/lib/generated/prisma/client";
import { logCreate } from "@/lib/services/audit";
import { createDeliveryRequest } from "@/lib/actions/delivery";
import { sendPaymentReceiptSMS } from "@/lib/services/sms-notifications";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: order.items?.map((item: Record<string, any>) => ({
      ...JSON.parse(JSON.stringify(item)),
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
      menuItem: item.menuItem ? {
        ...JSON.parse(JSON.stringify(item.menuItem)),
        price: Number(item.menuItem.price),
        cost: item.menuItem.cost ? Number(item.menuItem.cost) : 0,
      } : null,
    })) || [],
    branch: order.branch ? {
      ...JSON.parse(JSON.stringify(order.branch)),
      taxRate: Number(order.branch.taxRate),
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
  unitPrice: number;
  notes?: string;
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
}

export async function createPosOrder(input: CreatePosOrderInput) {
  try {
    const orderNumber = generateOrderNumber();
    
    // Fetch branch tax settings
    const branch = await db.branch.findUnique({
      where: { id: input.branchId },
      select: { taxRate: true, taxEnabled: true },
    });
    const taxRate = branch?.taxEnabled ? Number(branch?.taxRate || 12.5) / 100 : 0;
    
    const subtotal = input.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const discount = input.discount || 0;
    const deliveryFee = input.deliveryFee || 0;
    const subtotalAfterDiscount = subtotal - discount;
    const tax = subtotalAfterDiscount * taxRate;
    const total = subtotalAfterDiscount + tax + deliveryFee;

    // Create unified Order record with source: POS
    const order = await db.order.create({
      data: {
        orderNumber,
        branchId: input.branchId,
        cashierId: input.cashierId || null,
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
        items: {
          create: input.items.map((it) => ({
            menuItemId: it.menuItemId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            lineTotal: it.unitPrice * it.quantity,
            notes: it.notes,
          })),
        },
      },
      include: {
        items: { include: { menuItem: true } },
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
        if (!stationId) {
          const defaultStation = await db.kitchenStation.findFirst({
            where: { branchId: input.branchId, isActive: true },
          });
          stationId = defaultStation?.id;
        }

        if (stationId) {
          const kitchenTicket = await db.kitchenTicket.create({
            data: {
              orderId: order.id,
              stationId,
              status: "NEW",
              items: {
                create: order.items.map((item) => ({
                  orderItemId: item.id,
                  status: "NEW",
                })),
              },
            },
          });
          kitchenTicketId = kitchenTicket.id;
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
        items: { include: { menuItem: true } },
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
        items: { include: { menuItem: true } },
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.status === "COMPLETED") {
      return { success: false, error: "Order already completed" };
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
            create: order.items.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost: item.menuItem?.cost || 0,
              total: item.lineTotal,
              discount: 0,
            })),
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
export async function sendToKitchen(orderId: string, itemIds?: string[], stationId?: string) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true, branch: true },
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

    const itemsToSend = itemIds
      ? order.items.filter((item) => itemIds.includes(item.id))
      : order.items;

    if (itemsToSend.length === 0) return { success: false, error: "No items to send" };

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

// Create kitchen ticket from order (used from kitchen actions)
export async function createKitchenTicketFromOrder(orderId: string, stationId: string) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return { success: false, error: "Order not found" };

    const ticket = await db.kitchenTicket.create({
      data: {
        orderId: order.id,
        stationId,
        status: "NEW",
        items: {
          create: order.items.map((item) => ({ orderItemId: item.id, status: "NEW" })),
        },
      },
    });

    revalidatePath("/kitchen");
    return { success: true, data: ticket };
  } catch (error) {
    console.error("[createKitchenTicketFromOrder] Error:", error);
    return { success: false, error: "Failed to create kitchen ticket" };
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

