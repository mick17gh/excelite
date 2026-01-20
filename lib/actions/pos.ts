"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { OrderStatus, OrderType, SalesChannel } from "@/lib/generated/prisma/client";

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

    revalidatePath("/pos");
    revalidatePath("/dashboard");
    return { success: true, data: order };
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

    return { success: true, data: orders };
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
    return { success: true, data: order };
  } catch (error) {
    console.error("[updatePosOrderStatus] Error:", error);
    return { success: false, error: "Failed to update order status" };
  }
}

