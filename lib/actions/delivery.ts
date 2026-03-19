"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { DeliveryStatus } from "@/lib/generated/prisma/client";

export interface CreateDeliveryRequestInput {
  orderId: string;
  provider?: string;
  pickupAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryPhone?: string;
  customerName?: string;
  fee: number;
  notes?: string;
}

export interface UpdateDeliveryStatusInput {
  id: string;
  status: DeliveryStatus;
  driverName?: string;
  driverPhone?: string;
  estimatedTime?: number;
}

export async function getDeliveryRequests(filters?: {
  status?: DeliveryStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 100;

    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;

    if (filters?.startDate || filters?.endDate) {
      const createdAt: Record<string, Date> = {};
      if (filters?.startDate) createdAt.gte = new Date(filters.startDate);
      if (filters?.endDate) createdAt.lte = new Date(filters.endDate);
      where.createdAt = createdAt;
    }

    const [deliveries, total] = await Promise.all([
      db.deliveryRequest.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              status: true,
              source: true,
              branch: { select: { id: true, name: true } },
              customer: { select: { name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      db.deliveryRequest.count({ where }),
    ]);

    return {
      data: deliveries.map((d) => ({
        id: d.id,
        orderId: d.orderId,
        orderNumber: d.order?.orderNumber || "",
        orderTotal: Number(d.order?.total || 0),
        orderStatus: d.order?.status || "",
        orderSource: d.order?.source || "",
        branchName: d.order?.branch?.name || "",
        customerName: d.customerName,
        customerPhone: d.order?.customer?.phone || d.deliveryPhone,
        provider: d.provider,
        externalId: d.externalId,
        pickupAddress: d.pickupAddress,
        deliveryAddress: d.deliveryAddress,
        deliveryPhone: d.deliveryPhone,
        status: d.status,
        driverName: d.driverName,
        driverPhone: d.driverPhone,
        estimatedTime: d.estimatedTime,
        actualPickupTime: d.actualPickupTime?.toISOString() || null,
        actualDeliveryTime: d.actualDeliveryTime?.toISOString() || null,
        fee: Number(d.fee),
        notes: d.notes,
        createdAt: d.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("[getDeliveryRequests] Error:", error);
    return { data: [], total: 0, page: 1, pageSize: 100 };
  }
}

export async function createDeliveryRequest(input: CreateDeliveryRequestInput) {
  try {
    const existing = await db.deliveryRequest.findUnique({ where: { orderId: input.orderId } });
    if (existing) return { error: "Delivery request already exists for this order" };

    const delivery = await db.deliveryRequest.create({
      data: {
        orderId: input.orderId,
        provider: input.provider || null,
        pickupAddress: input.pickupAddress || null,
        pickupLat: input.pickupLat ?? null,
        pickupLng: input.pickupLng ?? null,
        deliveryAddress: input.deliveryAddress || null,
        deliveryLat: input.deliveryLat ?? null,
        deliveryLng: input.deliveryLng ?? null,
        deliveryPhone: input.deliveryPhone || null,
        customerName: input.customerName || null,
        fee: input.fee,
        notes: input.notes || null,
        status: "PENDING",
      },
    });

    revalidatePath("/dashboard/delivery");
    revalidatePath("/dashboard/orders");
    return { data: delivery };
  } catch (error) {
    console.error("[createDeliveryRequest] Error:", error);
    return { error: "Failed to create delivery request" };
  }
}

export async function updateDeliveryStatus(input: UpdateDeliveryStatusInput) {
  try {
    const data: Record<string, unknown> = { status: input.status };

    if (input.driverName) data.driverName = input.driverName;
    if (input.driverPhone) data.driverPhone = input.driverPhone;
    if (input.estimatedTime) data.estimatedTime = input.estimatedTime;

    if (input.status === "PICKED_UP") {
      data.actualPickupTime = new Date();
    }
    if (input.status === "DELIVERED") {
      data.actualDeliveryTime = new Date();
    }

    const delivery = await db.deliveryRequest.update({
      where: { id: input.id },
      data,
    });

    revalidatePath("/dashboard/delivery");
    return { data: delivery };
  } catch (error) {
    console.error("[updateDeliveryStatus] Error:", error);
    return { error: "Failed to update delivery status" };
  }
}

export async function getDeliveryStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, active, deliveredToday, avgTime] = await Promise.all([
      db.deliveryRequest.count(),
      db.deliveryRequest.count({ where: { status: { in: ["PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } } }),
      db.deliveryRequest.count({ where: { status: "DELIVERED", actualDeliveryTime: { gte: today } } }),
      db.deliveryRequest.aggregate({
        where: { status: "DELIVERED", actualDeliveryTime: { not: null }, actualPickupTime: { not: null } },
        _avg: { estimatedTime: true },
      }),
    ]);

    return {
      data: {
        total,
        active,
        deliveredToday,
        avgEstimatedTime: avgTime._avg.estimatedTime || 0,
      },
    };
  } catch (error) {
    console.error("[getDeliveryStats] Error:", error);
    return { data: { total: 0, active: 0, deliveredToday: 0, avgEstimatedTime: 0 } };
  }
}
