"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { OrderStatus } from "@/lib/generated/prisma/client";
import { sendOrderReadySMS } from "@/lib/services/sms-notifications";

export interface CreateStationInput {
  branchId: string;
  name: string;
  description?: string;
  categories?: string; // comma-separated
}

export async function createKitchenStation(input: CreateStationInput) {
  try {
    const station = await db.kitchenStation.create({
      data: {
        branchId: input.branchId,
        name: input.name,
        description: input.description,
        categories: input.categories,
        isActive: true,
      },
    });
    revalidatePath("/kitchen");
    return { success: true, data: station };
  } catch (error) {
    console.error("[createKitchenStation] Error:", error);
    return { success: false, error: "Failed to create kitchen station" };
  }
}

export async function updateKitchenStation(input: { id: string; name?: string; description?: string; categories?: string; isActive?: boolean }) {
  try {
    const station = await db.kitchenStation.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.categories !== undefined && { categories: input.categories }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
    revalidatePath("/dashboard/settings");
    revalidatePath("/kitchen");
    return { success: true, data: station };
  } catch (error) {
    console.error("[updateKitchenStation] Error:", error);
    return { success: false, error: "Failed to update kitchen station" };
  }
}

export async function deleteKitchenStation(id: string) {
  try {
    await db.kitchenStation.delete({ where: { id } });
    revalidatePath("/dashboard/settings");
    revalidatePath("/kitchen");
    return { success: true };
  } catch (error) {
    console.error("[deleteKitchenStation] Error:", error);
    return { success: false, error: "Failed to delete kitchen station" };
  }
}

export async function listKitchenStations(branchId?: string) {
  try {
    const stations = await db.kitchenStation.findMany({
      where: {
        isActive: true,
        ...(branchId && { branchId }),
      },
      orderBy: { name: "asc" },
    });
    return { success: true, data: stations };
  } catch (error) {
    console.error("[listKitchenStations] Error:", error);
    return { success: false, error: "Failed to fetch stations", data: [] };
  }
}

export async function listKitchenTickets(branchId?: string, stationId?: string) {
  try {
    const tickets = await db.kitchenTicket.findMany({
      where: {
        ...(stationId && { stationId }),
        ...(branchId && { station: { branchId } }),
      },
      include: {
        station: true,
        order: {
          include: {
            branch: true,
            items: { include: { menuItem: true } },
          },
        },
        items: {
          include: {
            orderItem: { include: { menuItem: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    // Serialize to strip Prisma Decimal wrappers from nested Order fields
    const serialized = tickets.map(ticket => {
      const plain = JSON.parse(JSON.stringify(ticket));
      return plain;
    });

    return { success: true, data: serialized };
  } catch (error) {
    console.error("[listKitchenTickets] Error:", error);
    return { success: false, error: "Failed to fetch tickets", data: [] };
  }
}

export async function updateKitchenItemStatus(itemId: string, status: OrderStatus) {
  try {
    const item = await db.kitchenItem.update({
      where: { id: itemId },
      data: {
        status,
        ...(status === "IN_PROGRESS" ? { startedAt: new Date() } : {}),
        ...(status === "READY" || status === "COMPLETED" ? { completedAt: new Date() } : {}),
      },
      include: {
        ticket: {
          include: {
            items: true,
          },
        },
      },
    });

    // Check if all items in the ticket are ready/completed
    if (item.ticket) {
      const allItemsReady = item.ticket.items.every(
        (i) => i.status === "READY" || i.status === "COMPLETED"
      );
      const allItemsCompleted = item.ticket.items.every(
        (i) => i.status === "COMPLETED"
      );

      if (allItemsCompleted) {
        await db.kitchenTicket.update({
          where: { id: item.ticketId },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      } else if (allItemsReady) {
        await db.kitchenTicket.update({
          where: { id: item.ticketId },
          data: { status: "READY" },
        });
      }
    }

    revalidatePath("/kitchen");
    return { success: true, data: item };
  } catch (error) {
    console.error("[updateKitchenItemStatus] Error:", error);
    return { success: false, error: "Failed to update kitchen item" };
  }
}

// Bump entire ticket (all items) to next status
export async function bumpTicket(ticketId: string) {
  try {
    const ticket = await db.kitchenTicket.findUnique({
      where: { id: ticketId },
      include: { items: true },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    let nextStatus: OrderStatus;
    switch (ticket.status) {
      case "NEW":
        nextStatus = "IN_PROGRESS";
        break;
      case "IN_PROGRESS":
        nextStatus = "READY";
        break;
      case "READY":
        nextStatus = "COMPLETED";
        break;
      default:
        return { success: false, error: "Ticket already completed" };
    }

    // Update all items
    await db.kitchenItem.updateMany({
      where: { ticketId },
      data: {
        status: nextStatus,
        ...(nextStatus === "IN_PROGRESS" ? { startedAt: new Date() } : {}),
        ...(nextStatus === "READY" || nextStatus === "COMPLETED"
          ? { completedAt: new Date() }
          : {}),
      },
    });

    // Update ticket
    const updatedTicket = await db.kitchenTicket.update({
      where: { id: ticketId },
      data: {
        status: nextStatus,
        ...(nextStatus === "COMPLETED" ? { completedAt: new Date() } : {}),
      },
    });

    // Sync order status: READY → order READY, COMPLETED → order COMPLETED
    if (nextStatus === "READY" || nextStatus === "COMPLETED") {
      await db.order.update({
        where: { id: updatedTicket.orderId },
        data: {
          status: nextStatus,
          ...(nextStatus === "COMPLETED" ? { closedAt: new Date() } : {}),
        },
      }).catch(() => {
        // Non-fatal: order may already be in this state
      });

      // Auto-send SMS notification when order is ready
      if (nextStatus === "READY") {
        try {
          await sendOrderReadySMS(updatedTicket.orderId);
        } catch (err) {
          console.warn("[bumpTicket] Failed to send order ready SMS:", err);
        }
      }
    }

    revalidatePath("/kitchen");
    revalidatePath("/dashboard/orders");
    return { success: true };
  } catch (error) {
    console.error("[bumpTicket] Error:", error);
    return { success: false, error: "Failed to bump ticket" };
  }
}

// Recall a completed ticket back to ready status
export async function recallTicket(ticketId: string) {
  try {
    const ticket = await db.kitchenTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    if (ticket.status !== "COMPLETED" && ticket.status !== "READY") {
      return { success: false, error: "Can only recall completed or ready tickets" };
    }

    const recallTo: OrderStatus = ticket.status === "COMPLETED" ? "READY" : "IN_PROGRESS";

    // Update all items
    await db.kitchenItem.updateMany({
      where: { ticketId },
      data: {
        status: recallTo,
        completedAt: null,
      },
    });

    // Update ticket
    await db.kitchenTicket.update({
      where: { id: ticketId },
      data: {
        status: recallTo,
        completedAt: null,
      },
    });

    revalidatePath("/kitchen");
    return { success: true };
  } catch (error) {
    console.error("[recallTicket] Error:", error);
    return { success: false, error: "Failed to recall ticket" };
  }
}

// Get kitchen stats for a branch
export async function getKitchenStats(branchId?: string) {
  try {
    const whereClause = branchId ? { station: { branchId } } : {};

    const [newCount, inProgressCount, readyCount, completedToday] = await Promise.all([
      db.kitchenTicket.count({ where: { ...whereClause, status: "NEW" } }),
      db.kitchenTicket.count({ where: { ...whereClause, status: "IN_PROGRESS" } }),
      db.kitchenTicket.count({ where: { ...whereClause, status: "READY" } }),
      db.kitchenTicket.count({
        where: {
          ...whereClause,
          status: "COMPLETED",
          completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    // Calculate average preparation time for completed tickets today
    const completedTickets = await db.kitchenTicket.findMany({
      where: {
        ...whereClause,
        status: "COMPLETED",
        completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      select: { createdAt: true, completedAt: true },
    });

    let avgPrepTime = 0;
    if (completedTickets.length > 0) {
      const totalTime = completedTickets.reduce((sum, t) => {
        if (t.completedAt) {
          return sum + (t.completedAt.getTime() - t.createdAt.getTime());
        }
        return sum;
      }, 0);
      avgPrepTime = Math.round(totalTime / completedTickets.length / 1000 / 60); // in minutes
    }

    return {
      success: true,
      data: {
        newCount,
        inProgressCount,
        readyCount,
        completedToday,
        avgPrepTime,
      },
    };
  } catch (error) {
    console.error("[getKitchenStats] Error:", error);
    return { success: false, error: "Failed to get kitchen stats" };
  }
}

// Create kitchen ticket from order
export async function createKitchenTicketFromOrder(orderId: string, stationId: string) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    const ticket = await db.kitchenTicket.create({
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
      include: { items: true },
    });

    revalidatePath("/kitchen");
    return { success: true, data: ticket };
  } catch (error) {
    console.error("[createKitchenTicketFromOrder] Error:", error);
    return { success: false, error: "Failed to create kitchen ticket" };
  }
}

