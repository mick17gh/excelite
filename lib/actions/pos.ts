"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { OrderStatus, OrderType, SalesChannel } from "@/lib/generated/prisma/client";
import { logCreate } from "@/lib/services/audit";

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
  type: OrderType;
  sourceChannel: SalesChannel;
  items: CreatePosOrderItemInput[];
  paymentMethod?: string;
  customerName?: string;
  notes?: string;
  discount?: number;
  sendToKitchen?: boolean; // Automatically create kitchen ticket
  stationId?: string; // Specific kitchen station (optional)
}

export async function createPosOrder(input: CreatePosOrderInput) {
  try {
    const orderNumber = generateOrderNumber();
    const subtotal = input.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const discount = input.discount || 0;
    const subtotalAfterDiscount = subtotal - discount;
    const tax = subtotalAfterDiscount * 0.125;
    const total = subtotalAfterDiscount + tax;

    const order = await db.posOrder.create({
      data: {
        orderNumber,
        branchId: input.branchId,
        cashierId: input.cashierId,
        type: input.type,
        sourceChannel: input.sourceChannel,
        subtotal,
        tax,
        discount,
        total,
        status: "NEW",
        paymentMethod: input.paymentMethod || null,
        customerName: input.customerName || null,
        notes: input.notes || null,
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
        // Find the default station for the branch or use the provided one
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
        // Don't fail the order if kitchen ticket fails
      }
    }

    // Create audit log
    await logCreate(
      "PosOrder",
      order.id,
      {
        orderNumber,
        branchId: input.branchId,
        total,
        itemCount: input.items.length,
        channel: input.sourceChannel,
        kitchenTicketId,
      }
    );

    revalidatePath("/pos");
    revalidatePath("/dashboard");
    revalidatePath("/kitchen");
    
    // Convert Decimal fields to plain numbers to avoid serialization issues
    const convertedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      branchId: order.branchId,
      cashierId: order.cashierId,
      type: order.type,
      sourceChannel: order.sourceChannel,
      status: order.status,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
      paymentMethod: order.paymentMethod,
      customerName: order.customerName,
      notes: order.notes,
      openedAt: order.openedAt,
      closedAt: order.closedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      branch: order.branch,
      cashier: order.cashier,
      items: order.items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
        notes: item.notes,
        menuItem: item.menuItem ? {
          id: item.menuItem.id,
          name: item.menuItem.name,
          sku: item.menuItem.sku,
          categoryId: item.menuItem.categoryId,
          price: Number(item.menuItem.price),
          cost: Number(item.menuItem.cost),
          imageUrl: item.menuItem.imageUrl,
          description: item.menuItem.description,
          isActive: item.menuItem.isActive,
        } : null,
      })),
    };
    
    return { success: true, data: convertedOrder };
  } catch (error) {
    console.error("[createPosOrder] Error:", error);
    return { success: false, error: "Failed to create POS order" };
  }
}

export async function listPosOrders(branchId?: string, status?: OrderStatus) {
  try {
    const orders = await db.posOrder.findMany({
      where: {
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

    // Convert Decimal fields to plain numbers to avoid serialization issues
    const convertedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      branchId: order.branchId,
      cashierId: order.cashierId,
      type: order.type,
      sourceChannel: order.sourceChannel,
      status: order.status,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
      paymentMethod: order.paymentMethod,
      customerName: order.customerName,
      notes: order.notes,
      openedAt: order.openedAt,
      closedAt: order.closedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      branch: order.branch,
      items: order.items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
        notes: item.notes,
        menuItem: item.menuItem ? {
          id: item.menuItem.id,
          name: item.menuItem.name,
          sku: item.menuItem.sku,
          categoryId: item.menuItem.categoryId,
          price: Number(item.menuItem.price),
          cost: Number(item.menuItem.cost),
          imageUrl: item.menuItem.imageUrl,
          description: item.menuItem.description,
          isActive: item.menuItem.isActive,
        } : null,
      })),
    }));

    return { success: true, data: convertedOrders };
  } catch (error) {
    console.error("[listPosOrders] Error:", error);
    return { success: false, error: "Failed to fetch POS orders", data: [] };
  }
}

export async function updatePosOrderStatus(orderId: string, status: OrderStatus) {
  try {
    const order = await db.posOrder.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === "COMPLETED" ? { closedAt: new Date() } : {}),
      },
    });

    revalidatePath("/pos");
    revalidatePath("/kitchen");
    
    // Convert Decimal fields to plain numbers to avoid serialization issues
    const convertedOrder = {
      ...order,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
    };
    
    return { success: true, data: convertedOrder };
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
}

export async function completeOrder(input: CompleteOrderInput) {
  try {
    // Get the order with items
    const order = await db.posOrder.findUnique({
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

    // Update order status
    await db.posOrder.update({
      where: { id: input.orderId },
      data: {
        status: "COMPLETED",
        paymentMethod: input.paymentMethod,
        closedAt: new Date(),
      },
    });

    // Create sale record if requested
    let saleId: string | null = null;
    if (input.createSale !== false) { // Default to true
      // Generate sale number
      const saleNumber = `SALE-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      // Determine day part
      const hour = new Date().getHours();
      let dayPart: "BREAKFAST" | "LUNCH" | "DINNER" | "LATE_NIGHT" = "LATE_NIGHT";
      if (hour >= 6 && hour < 11) dayPart = "BREAKFAST";
      else if (hour >= 11 && hour < 15) dayPart = "LUNCH";
      else if (hour >= 15 && hour < 21) dayPart = "DINNER";

      // Create transaction first
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

      // Create sale
      const sale = await db.sale.create({
        data: {
          saleNumber,
          branchId: order.branchId,
          transactionId: transaction.id,
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
          channel: order.sourceChannel || "POS",
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

      // Create audit log
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

    revalidatePath("/pos");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");

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

// Send specific items to kitchen
export async function sendToKitchen(orderId: string, itemIds?: string[], stationId?: string) {
  try {
    const order = await db.posOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        branch: true,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Find or determine station
    let targetStationId = stationId;
    if (!targetStationId) {
      const defaultStation = await db.kitchenStation.findFirst({
        where: { branchId: order.branchId, isActive: true },
      });
      targetStationId = defaultStation?.id;
    }

    if (!targetStationId) {
      return { success: false, error: "No kitchen station found" };
    }

    // Filter items to send
    const itemsToSend = itemIds
      ? order.items.filter((item) => itemIds.includes(item.id))
      : order.items;

    if (itemsToSend.length === 0) {
      return { success: false, error: "No items to send" };
    }

    // Create kitchen ticket
    const kitchenTicket = await db.kitchenTicket.create({
      data: {
        orderId: order.id,
        stationId: targetStationId,
        status: "NEW",
        items: {
          create: itemsToSend.map((item) => ({
            orderItemId: item.id,
            status: "NEW",
          })),
        },
      },
      include: {
        items: {
          include: {
            orderItem: {
              include: { menuItem: true },
            },
          },
        },
      },
    });

    revalidatePath("/pos");
    revalidatePath("/kitchen");

    return {
      success: true,
      data: {
        ticketId: kitchenTicket.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        stationId: targetStationId,
        itemCount: itemsToSend.length,
      },
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
    const order = await db.posOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.status === "COMPLETED") {
      return { success: false, error: "Cannot void a completed order" };
    }

    await db.posOrder.update({
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

