"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { OrderStatus } from "@/lib/generated/prisma/client";

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

    return { success: true, data: tickets };
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
    });
    revalidatePath("/kitchen");
    return { success: true, data: item };
  } catch (error) {
    console.error("[updateKitchenItemStatus] Error:", error);
    return { success: false, error: "Failed to update kitchen item" };
  }
}

