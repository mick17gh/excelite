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
  neighborhood?: string;
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
  deliveryIssues?: Array<
    | "SPILLAGE"
    | "MECHANICAL"
    | "DROP_OFF_ADDRESS"
    | "EXCESSIVE_DELAY"
    | "INACCURATE_ORDER"
    | "PROFESSIONALISM"
  >;
  comments?: string;
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
              orderReceivedTime: true,
              createdAt: true,
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
        neighborhood: d.neighborhood,
        deliveryPhone: d.deliveryPhone,
        status: d.status,
        driverName: d.driverName,
        driverPhone: d.driverPhone,
        estimatedTime: d.estimatedTime,
        actualPickupTime: d.actualPickupTime?.toISOString() || null,
        dispatchTime: d.dispatchTime?.toISOString() || null,
        actualDeliveryTime: d.actualDeliveryTime?.toISOString() || null,
        orderReceivedTime:
          d.order?.orderReceivedTime?.toISOString() ||
          d.order?.createdAt?.toISOString() ||
          null,
        preparationTimeMins:
          d.order?.orderReceivedTime && d.actualPickupTime
            ? Math.round(
                (d.actualPickupTime.getTime() - d.order.orderReceivedTime.getTime()) /
                  60000,
              )
            : null,
        averageOrderToCustomerTimeMins:
          (d.order?.orderReceivedTime || d.order?.createdAt) && d.actualDeliveryTime
            ? Math.round(
                (d.actualDeliveryTime.getTime() -
                  (d.order?.orderReceivedTime || d.order?.createdAt).getTime()) /
                  60000,
              )
            : null,
        fee: Number(d.fee),
        notes: d.notes,
        comments: d.comments,
        deliveryIssues: d.deliveryIssues,
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
        neighborhood: input.neighborhood || null,
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
    if (input.deliveryIssues) data.deliveryIssues = input.deliveryIssues;
    if (input.comments !== undefined) data.comments = input.comments || null;

    if (input.status === "PICKED_UP") {
      data.actualPickupTime = new Date();
      data.dispatchTime = new Date();
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

    const [total, active, deliveredToday, avgTime, deliveredWithOrder] = await Promise.all([
      db.deliveryRequest.count(),
      db.deliveryRequest.count({ where: { status: { in: ["PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } } }),
      db.deliveryRequest.count({ where: { status: "DELIVERED", actualDeliveryTime: { gte: today } } }),
      db.deliveryRequest.aggregate({
        where: { status: "DELIVERED", actualDeliveryTime: { not: null }, actualPickupTime: { not: null } },
        _avg: { estimatedTime: true },
      }),
      db.deliveryRequest.findMany({
        where: {
          status: "DELIVERED",
          actualDeliveryTime: { not: null },
        },
        select: {
          actualDeliveryTime: true,
          order: {
            select: { createdAt: true, orderReceivedTime: true },
          },
        },
      }),
    ]);

    const averageOrderToCustomerTimeMins =
      deliveredWithOrder.length > 0
        ? Math.round(
            deliveredWithOrder.reduce((sum, d) => {
              const start = d.order.orderReceivedTime || d.order.createdAt;
              return sum + (d.actualDeliveryTime!.getTime() - start.getTime()) / 60000;
            }, 0) / deliveredWithOrder.length,
          )
        : 0;

    return {
      data: {
        total,
        active,
        deliveredToday,
        avgEstimatedTime: avgTime._avg.estimatedTime || 0,
        averageOrderToCustomerTimeMins,
      },
    };
  } catch (error) {
    console.error("[getDeliveryStats] Error:", error);
    return { data: { total: 0, active: 0, deliveredToday: 0, avgEstimatedTime: 0 } };
  }
}
