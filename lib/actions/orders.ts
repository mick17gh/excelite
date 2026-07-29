"use server";

import { db } from "@/lib/db";
import { isBranchPaystackCheckoutAvailable } from "@/lib/paystack/order-settlement";
import { revalidatePath } from "next/cache";
import { OrderStatus, OrderSource, OrderType, PaymentStatus } from "@/lib/generated/prisma/client";
import { createDeliveryRequest } from "@/lib/actions/delivery";
import {
  applyDefaultMenuItemSelections,
  resolveMenuItemSelections,
} from "@/lib/menu-selections";
import { filterOrderItemsForKitchenStation } from "@/lib/kitchen/category-routing";
import { getKitchenEligibleOrderItems } from "@/lib/kitchen/ticket-items";
import { computeOrderTaxAmounts } from "@/lib/services/tax-calculation";
import { resolveOrderPlacedByName } from "@/lib/orders/placed-by";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { startOfDay } from "date-fns";

// Helper to serialize Decimal fields from raw Prisma order objects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeOrderItem(item: Record<string, any>) {
  return {
    id: item.id as string,
    orderId: item.orderId as string,
    menuItemId: item.menuItemId as string,
    quantity: item.quantity as number,
    unitPrice: Number(item.unitPrice),
    lineTotal: Number(item.lineTotal),
    notes: item.notes ?? null,
    configurationLabel: item.configurationLabel ?? null,
    configurationKey: item.configurationKey ?? null,
    menuItemOptionIds:
      item.selections?.map((s: { menuItemOptionId: string }) => s.menuItemOptionId) ?? [],
    menuItem: item.menuItem
      ? {
          id: item.menuItem.id as string,
          name: item.menuItem.name as string,
          sku: item.menuItem.sku as string,
          price: Number(item.menuItem.price),
          cost: item.menuItem.cost != null ? Number(item.menuItem.cost) : null,
          category: item.menuItem.category
            ? { name: item.menuItem.category.name as string }
            : null,
        }
      : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeOrder(order: Record<string, any>) {
  return {
    id: order.id as string,
    orderNumber: order.orderNumber as string,
    customerId: order.customerId ?? null,
    customerName: order.customerName ?? null,
    branchId: order.branchId as string,
    assignedBy: order.assignedBy ?? null,
    source: order.source,
    type: order.type as OrderType,
    status: order.status as OrderStatus,
    paymentStatus: order.paymentStatus as PaymentStatus,
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    discount: Number(order.discount),
    deliveryFee: Number(order.deliveryFee),
    total: Number(order.total),
    paymentMethod: order.paymentMethod ?? null,
    notes: order.notes ?? null,
    deliveryAddress: order.deliveryAddress ?? null,
    deliveryCity: order.deliveryCity ?? null,
    deliveryNeighborhood: order.deliveryNeighborhood ?? null,
    deliveryPhone: order.deliveryPhone ?? null,
    deliveryNotes: order.deliveryNotes ?? null,
    deliveryLat: order.deliveryLat ? Number(order.deliveryLat) : null,
    deliveryLng: order.deliveryLng ? Number(order.deliveryLng) : null,
    items: order.items?.map(serializeOrderItem) ?? [],
    branch: order.branch ? { name: order.branch.name as string } : null,
    createdAt: order.createdAt?.toISOString?.() ?? order.createdAt,
    updatedAt: order.updatedAt?.toISOString?.() ?? order.updatedAt,
  };
}

export interface CreateOrderInput {
  customerId?: string;
  customerName?: string;
  branchId: string;
  source: OrderSource;
  type: OrderType;
  items: {
    menuItemId: string;
    quantity: number;
    unitPrice?: number;
    notes?: string;
    /** Selected option ids (multi-group); server validates and recomputes price */
    menuItemOptionIds?: string[];
  }[];
  notes?: string;
  paymentMethod?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryNeighborhood?: string;
  deliveryPhone?: string;
  deliveryNotes?: string;
  deliveryFee?: number;
  discount?: number;
  sendToKitchen?: boolean;
  stationId?: string;
}

export interface UpdateOrderStatusInput {
  id: string;
  status: OrderStatus;
}

export interface AssignOrderInput {
  id: string;
  assignedBy: string;
}

export async function getOrders(filters?: {
  branchId?: string;
  status?: OrderStatus;
  source?: OrderSource;
  startDate?: string;
  endDate?: string;
  customerId?: string;
  page?: number;
  pageSize?: number;
  /** When true (default), show today's orders plus open/unpaid carryover from prior days. */
  activeDayView?: boolean;
}) {
  try {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const activeDayView = filters?.activeDayView !== false;
    const hasExplicitDateRange = Boolean(filters?.startDate || filters?.endDate);

    const where: Record<string, unknown> = {};

    if (filters?.branchId) where.branchId = filters.branchId;
    if (filters?.status) where.status = filters.status;
    if (filters?.source) where.source = filters.source;
    if (filters?.customerId) where.customerId = filters.customerId;

    if (hasExplicitDateRange) {
      const createdAt: Record<string, Date> = {};
      if (filters?.startDate) createdAt.gte = new Date(filters.startDate);
      if (filters?.endDate) createdAt.lte = new Date(filters.endDate);
      where.createdAt = createdAt;
    } else if (activeDayView) {
      // Today’s orders, plus prior-day work still open or still awaiting payment
      const todayStart = startOfDay(new Date());
      where.OR = [
        { createdAt: { gte: todayStart } },
        { status: { in: [OrderStatus.NEW, OrderStatus.IN_PROGRESS, OrderStatus.READY] } },
        {
          paymentStatus: PaymentStatus.PENDING,
          status: { not: OrderStatus.CANCELLED },
        },
      ];
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
              taxInclusive: true,
              showTaxOnReceipt: true,
              taxNumber: true,
              showTaxNumberOnReceipt: true,
              taxName: true,
              taxRate: true,
              taxEnabled: true,
              paystackSubaccountCode: true,
              paystackSubaccountActive: true,
              organization: {
                select: {
                  features: true,
                  paystackEnabled: true,
                  paystackDashboardEnabled: true,
                },
              },
            },
          },
          items: {
            include: {
              menuItem: { select: { id: true, name: true, sku: true, price: true } },
              selections: { select: { menuItemOptionId: true } },
            },
          },
          delivery: true,
          payments: true,
          notifications: true,
          receipt: true,
          assignedByUser: { select: { id: true, name: true } },
          cashier: { select: { id: true, name: true } },
          tableSession: {
            select: {
              guestCount: true,
              table: { select: { label: true, section: { select: { name: true } } } },
              opener: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      db.order.count({ where }),
    ]);

    return {
      data: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customer?.name || order.customerName || null,
        customerPhone: order.customer?.phone || order.deliveryPhone || null,
        branchId: order.branchId,
        branchName: order.branch?.name || "",
        branchCode: order.branch?.code || "",
        taxInclusive: order.branch?.taxInclusive ?? false,
        showTaxOnReceipt: order.branch?.showTaxOnReceipt ?? true,
        taxNumber: order.branch?.taxNumber ?? null,
        showTaxNumberOnReceipt: order.branch?.showTaxNumberOnReceipt ?? false,
        taxName: order.branch?.taxName || "VAT",
        taxRate: order.branch?.taxRate != null ? Number(order.branch.taxRate) : 0,
        taxEnabled: order.branch?.taxEnabled ?? true,
        assignedBy: order.assignedByUser?.name || null,
        placedBy: resolveOrderPlacedByName(order),
        tableLabel: order.tableSession?.table.label ?? null,
        tableSection: order.tableSession?.table.section?.name ?? null,
        tableCovers: order.tableSession?.guestCount ?? null,
        tableWaiter: order.tableSession?.opener?.name ?? null,
        source: order.source,
        type: order.type,
        status: order.status,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        discount: Number(order.discount),
        deliveryFee: Number(order.deliveryFee),
        total: Number(order.total),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paystackEnabled:
          order.branch?.organization && order.branch
            ? isBranchPaystackCheckoutAvailable(order.branch.organization, order.branch, "dashboard")
            : false,
        notes: order.notes,
        deliveryAddress: order.deliveryAddress,
        deliveryCity: order.deliveryCity,
        deliveryNeighborhood: order.deliveryNeighborhood,
        deliveryPhone: order.deliveryPhone,
        deliveryNotes: order.deliveryNotes,
        orderReceivedTime: order.orderReceivedTime?.toISOString() || null,
        deliveryStatus: order.delivery?.status || null,
        items: order.items.map((item) => ({
          id: item.id,
          menuItemId: item.menuItemId,
          menuItemName: item.menuItem?.name || "",
          menuItemSku: item.menuItem?.sku || "",
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
          notes: item.notes,
          configurationLabel: item.configurationLabel,
          configurationKey: item.configurationKey,
          menuItemOptionIds: item.selections?.map((s) => s.menuItemOptionId) ?? [],
        })),
        payments: order.payments.map((p) => ({
          id: p.id,
          reference: p.reference,
          amount: Number(p.amount),
          currency: p.currency,
          status: p.status,
          provider: p.provider,
          paymentMethod: p.paymentMethod,
          paidAt: p.paidAt?.toISOString() || null,
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        notifications: (order as any).notifications?.map((n: any) => ({
          id: n.id,
          orderId: n.orderId,
          type: n.type,
          channel: n.channel,
          recipient: n.recipient,
          subject: n.subject,
          message: n.message,
          status: n.status,
          sentAt: n.sentAt?.toISOString() || null,
          error: n.error,
          createdAt: n.createdAt.toISOString(),
        })) || [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        receipt: (() => { const r = (order as any).receipt; return r ? {
          id: r.id, orderId: r.orderId, receiptNumber: r.receiptNumber,
          customerName: r.customerName, customerPhone: r.customerPhone, customerEmail: r.customerEmail,
          items: r.items, subtotal: Number(r.subtotal), tax: Number(r.tax),
          discount: Number(r.discount), deliveryFee: Number(r.deliveryFee), total: Number(r.total),
          paymentMethod: r.paymentMethod, pdfUrl: r.pdfUrl, sentVia: r.sentVia,
          createdAt: r.createdAt.toISOString(),
        } : null; })(),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("[getOrders] Error:", error);
    return { data: [], total: 0, page: 1, pageSize: 50 };
  }
}

export async function getOrderById(id: string) {
  try {
    const order = await db.order.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            taxInclusive: true,
            showTaxOnReceipt: true,
            taxNumber: true,
            showTaxNumberOnReceipt: true,
            taxName: true,
            taxRate: true,
            taxEnabled: true,
            paystackSubaccountCode: true,
            paystackSubaccountActive: true,
            organization: {
              select: {
                features: true,
                paystackEnabled: true,
                paystackDashboardEnabled: true,
              },
            },
          },
        },
        items: {
          include: {
            menuItem: { select: { id: true, name: true, sku: true, price: true } },
            selections: { select: { menuItemOptionId: true } },
          },
        },
        delivery: true,
        payments: true,
        notifications: { orderBy: { createdAt: "desc" } },
        receipt: true,
        assignedByUser: { select: { id: true, name: true } },
        cashier: { select: { id: true, name: true } },
      },
    });

    if (!order) return { data: null };

    return {
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        branchId: order.branchId,
        assignedBy: order.assignedByUser?.name || null,
        placedBy: resolveOrderPlacedByName(order),
        source: order.source,
        type: order.type,
        status: order.status,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        discount: Number(order.discount),
        deliveryFee: Number(order.deliveryFee),
        total: Number(order.total),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paystackEnabled:
          order.branch?.organization && order.branch
            ? isBranchPaystackCheckoutAvailable(order.branch.organization, order.branch, "dashboard")
            : false,
        notes: order.notes,
        deliveryAddress: order.deliveryAddress,
        deliveryCity: order.deliveryCity,
        deliveryNeighborhood: order.deliveryNeighborhood,
        deliveryLat: order.deliveryLat ? Number(order.deliveryLat) : null,
        deliveryLng: order.deliveryLng ? Number(order.deliveryLng) : null,
        deliveryPhone: order.deliveryPhone,
        deliveryNotes: order.deliveryNotes,
        orderReceivedTime: order.orderReceivedTime?.toISOString() || null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        branch: order.branch,
        assignedByUser: order.assignedByUser,
        customer: order.customer ? {
          id: order.customer.id,
          name: order.customer.name,
          phone: order.customer.phone,
          email: order.customer.email,
          address: order.customer.address,
          city: order.customer.city,
          latitude: order.customer.latitude ? Number(order.customer.latitude) : null,
          longitude: order.customer.longitude ? Number(order.customer.longitude) : null,
          isActive: order.customer.isActive,
          createdAt: order.customer.createdAt.toISOString(),
        } : order.customerName ? {
          id: "guest",
          name: order.customerName,
          phone: order.deliveryPhone || "",
          email: null,
          address: order.deliveryAddress,
          city: order.deliveryCity,
          latitude: null,
          longitude: null,
          isActive: true,
          createdAt: order.createdAt.toISOString(),
        } : null,
        items: order.items.map((item) => ({
          id: item.id,
          orderId: item.orderId,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
          notes: item.notes,
          configurationLabel: item.configurationLabel,
          configurationKey: item.configurationKey,
          menuItemOptionIds: item.selections?.map((s) => s.menuItemOptionId) ?? [],
          menuItem: item.menuItem ? {
            id: item.menuItem.id,
            name: item.menuItem.name,
            sku: item.menuItem.sku,
            price: Number(item.menuItem.price),
          } : null,
        })),
        payments: order.payments.map((p) => ({
          id: p.id,
          orderId: p.orderId,
          reference: p.reference,
          amount: Number(p.amount),
          currency: p.currency,
          status: p.status,
          provider: p.provider,
          paymentMethod: p.paymentMethod,
          providerRef: p.providerRef,
          paidAt: p.paidAt?.toISOString() || null,
          metadata: p.metadata,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        notifications: (order.notifications || []).map((n: Record<string, any>) => ({
          id: n.id,
          orderId: n.orderId,
          type: n.type,
          channel: n.channel,
          recipient: n.recipient,
          subject: n.subject,
          message: n.message,
          status: n.status,
          sentAt: n.sentAt?.toISOString() || null,
          error: n.error,
          createdAt: n.createdAt.toISOString(),
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        receipt: (() => { const r = order.receipt as Record<string, any> | null; return r ? {
          id: r.id, orderId: r.orderId, receiptNumber: r.receiptNumber,
          customerName: r.customerName, customerPhone: r.customerPhone, customerEmail: r.customerEmail,
          items: r.items, subtotal: Number(r.subtotal), tax: Number(r.tax),
          discount: Number(r.discount), deliveryFee: Number(r.deliveryFee), total: Number(r.total),
          paymentMethod: r.paymentMethod, pdfUrl: r.pdfUrl, sentVia: r.sentVia,
          createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
        } : null; })(),
        delivery: order.delivery ? {
          id: order.delivery.id,
          orderId: order.delivery.orderId,
          provider: order.delivery.provider,
          externalId: order.delivery.externalId,
          pickupAddress: order.delivery.pickupAddress,
          pickupLat: Number(order.delivery.pickupLat),
          pickupLng: Number(order.delivery.pickupLng),
          deliveryAddress: order.delivery.deliveryAddress,
          deliveryLat: Number(order.delivery.deliveryLat),
          deliveryLng: Number(order.delivery.deliveryLng),
          deliveryPhone: order.delivery.deliveryPhone,
          customerName: order.delivery.customerName,
          fee: Number(order.delivery.fee),
          status: order.delivery.status,
          driverName: order.delivery.driverName,
          driverPhone: order.delivery.driverPhone,
          estimatedTime: order.delivery.estimatedTime,
          actualPickupTime: order.delivery.actualPickupTime?.toISOString() || null,
          actualDeliveryTime: order.delivery.actualDeliveryTime?.toISOString() || null,
          notes: order.delivery.notes,
          createdAt: order.delivery.createdAt.toISOString(),
          updatedAt: order.delivery.updatedAt.toISOString(),
        } : null,
      },
    };
  } catch (error) {
    console.error("[getOrderById] Error:", error);
    return { data: null };
  }
}

export async function createOrder(input: CreateOrderInput) {
  try {
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    // Get menu items for pricing
    const menuItemIds = [...new Set(input.items.map((i) => i.menuItemId))];
    const { assertMenuItemsVisibleAtBranch } = await import(
      "@/lib/menu/branch-availability"
    );
    const visibilityCheck = await assertMenuItemsVisibleAtBranch(
      menuItemIds,
      input.branchId
    );
    if (!visibilityCheck.ok) {
      return { error: visibilityCheck.error };
    }

    const menuItems = await db.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    let subtotal = 0;
    const orderItemsPayload: {
      menuItemId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      notes?: string;
      configurationLabel: string | null;
      configurationKey: string | null;
      optionIds: string[];
    }[] = [];

    for (const item of input.items) {
      const withDefaults = await applyDefaultMenuItemSelections(
        item.menuItemId,
        item.menuItemOptionIds
      );
      const resolved = await resolveMenuItemSelections(item.menuItemId, withDefaults);
      if (!resolved.ok) {
        return { error: resolved.error };
      }
      const menuItem = menuItemMap.get(item.menuItemId);
      if (!menuItem) {
        return { error: `Menu item not found: ${item.menuItemId}` };
      }
      const quantity = item.quantity || 1;
      const unitPrice = resolved.data.unitPrice;
      const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
      subtotal += lineTotal;
      orderItemsPayload.push({
        menuItemId: item.menuItemId,
        quantity,
        unitPrice,
        lineTotal,
        notes: item.notes,
        configurationLabel: resolved.data.configurationLabel || null,
        configurationKey: resolved.data.configurationKey || null,
        optionIds: resolved.data.resolvedOptionIds,
      });
    }

    const { assertCartStockAvailable } = await import(
      "@/lib/services/menu-stock-availability"
    );
    const stockCheck = await assertCartStockAvailable(
      input.branchId,
      orderItemsPayload.map((p) => ({
        menuItemId: p.menuItemId,
        quantity: p.quantity,
        menuItemOptionIds: p.optionIds,
        menuItemName: menuItemMap.get(p.menuItemId)?.name,
      }))
    );
    if (!stockCheck.ok) {
      return { error: stockCheck.error };
    }

    const branch = await db.branch.findUnique({
      where: { id: input.branchId },
      select: { taxRate: true, taxEnabled: true, taxInclusive: true },
    });
    const discount = input.discount || 0;
    const deliveryFee = input.deliveryFee || 0;
    const { subtotal: netSubtotal, tax, total } = computeOrderTaxAmounts({
      lineTotal: subtotal,
      discount,
      deliveryFee,
      ratePercent: Number(branch?.taxRate ?? 12.5),
      enabled: branch?.taxEnabled ?? true,
      inclusive: branch?.taxInclusive ?? false,
    });

    const session = await auth.api.getSession({ headers: await headers() });
    const placedByUserId = session?.user?.id ?? null;

    const order = await db.order.create({
      data: {
        orderNumber,
        customerId: input.customerId || null,
        customerName: input.customerName || null,
        branchId: input.branchId,
        assignedBy: placedByUserId,
        source: input.source,
        type: input.type,
        status: "NEW",
        subtotal: netSubtotal,
        tax,
        discount,
        deliveryFee,
        total,
        paymentMethod: input.paymentMethod || null,
        paymentStatus: "PENDING",
        notes: input.notes || null,
        deliveryAddress: input.deliveryAddress || null,
        deliveryCity: input.deliveryCity || null,
        deliveryNeighborhood: input.deliveryNeighborhood || null,
        deliveryPhone: input.deliveryPhone || null,
        deliveryNotes: input.deliveryNotes || null,
        items: {
          create: orderItemsPayload.map((oi) => ({
            menuItemId: oi.menuItemId,
            quantity: oi.quantity,
            unitPrice: oi.unitPrice,
            lineTotal: oi.lineTotal,
            notes: oi.notes,
            configurationLabel: oi.configurationLabel,
            configurationKey: oi.configurationKey,
            selections:
              oi.optionIds.length > 0
                ? {
                    create: oi.optionIds.map((menuItemOptionId) => ({ menuItemOptionId })),
                  }
                : undefined,
          })),
        },
      },
      include: {
        items: {
          include: {
            menuItem: {
              include: { category: { select: { name: true } } },
            },
            selections: { select: { menuItemOptionId: true } },
          },
        },
        branch: { select: { name: true } },
      },
    });

    // Auto-create kitchen ticket if requested
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
            await db.kitchenTicket.create({
              data: {
                orderId: order.id,
                stationId,
                status: "NEW",
                items: {
                  create: kitchenItems.map((item) => ({ orderItemId: item.id, status: "NEW" })),
                },
              },
            });
          }
        }
      } catch (err) {
        console.warn("[createOrder] Failed to create kitchen ticket:", err);
      }
    }

    // Auto-create DeliveryRequest for DELIVERY orders
    if (input.type === "DELIVERY") {
      try {
        await createDeliveryRequest({
          orderId: order.id,
          deliveryAddress: input.deliveryAddress || undefined,
          neighborhood: input.deliveryNeighborhood || undefined,
          deliveryPhone: input.deliveryPhone || undefined,
          fee: input.deliveryFee || 0,
          notes: input.deliveryNotes || undefined,
        });
      } catch (err) {
        console.warn("[createOrder] Failed to create delivery request:", err);
      }
    }

    revalidatePath("/dashboard/orders");
    revalidatePath("/kitchen");
    revalidatePath("/dashboard/delivery");
    return { data: serializeOrder(order) };
  } catch (error) {
    console.error("[createOrder] Error:", error);
    return { error: "Failed to create order" };
  }
}

export async function updateOrderStatus(input: { id: string; status: OrderStatus }) {
  try {
    const order = await db.order.update({
      where: { id: input.id },
      data: { status: input.status },
    });

    if (input.status === "CANCELLED") {
      const { cancelKitchenTicketsForOrder } = await import("@/lib/kitchen/cancel-tickets");
      await cancelKitchenTicketsForOrder(input.id);
    }

    revalidatePath("/dashboard/orders");
    revalidatePath("/kitchen");
    return { data: serializeOrder(order) };
  } catch (error) {
    console.error("[updateOrderStatus] Error:", error);
    return { error: "Failed to update order status" };
  }
}

export async function sendOrderToKitchen(input: { orderId: string; stationId?: string }) {
  try {
    const order = await db.order.findUnique({
      where: { id: input.orderId },
      select: { id: true, branchId: true },
    });

    if (!order) {
      return { error: "Order not found" };
    }

    const existingTicket = await db.kitchenTicket.findFirst({
      where: { orderId: input.orderId },
    });

    if (existingTicket) {
      return { error: "Order already sent to kitchen" };
    }

    let stationId = input.stationId;
    if (!stationId) {
      const defaultStation = await db.kitchenStation.findFirst({
        where: { branchId: order.branchId, isActive: true },
      });
      stationId = defaultStation?.id;
    }

    if (!stationId) {
      return { error: "No active kitchen station found for this branch" };
    }

    const eligible = await getKitchenEligibleOrderItems(input.orderId, stationId);
    if (!eligible.ok) {
      return { error: eligible.error };
    }

    const ticket = await db.kitchenTicket.create({
      data: {
        orderId: input.orderId,
        stationId,
        status: "NEW",
        items: {
          create: eligible.items.map((item) => ({
            orderItemId: item.id,
            status: "NEW",
          })),
        },
      },
    });

    revalidatePath("/dashboard/orders");
    revalidatePath("/kitchen");
    return { success: true, data: ticket };
  } catch (error) {
    console.error("[sendOrderToKitchen] Error:", error);
    return { error: "Failed to send order to kitchen" };
  }
}

export async function cancelOrder(id: string, reason?: string) {
  try {
    const order = await db.order.update({
      where: { id },
      data: {
        status: "CANCELLED",
        notes: reason ? `Cancelled: ${reason}` : undefined,
      },
    });

    const { cancelKitchenTicketsForOrder } = await import("@/lib/kitchen/cancel-tickets");
    await cancelKitchenTicketsForOrder(id);

    revalidatePath("/dashboard/orders");
    revalidatePath("/kitchen");
    return { data: serializeOrder(order) };
  } catch (error) {
    console.error("[cancelOrder] Error:", error);
    return { error: "Failed to cancel order" };
  }
}

export async function getOrderStats(branchId?: string) {
  try {
    const where: Record<string, unknown> = {};
    if (branchId) where.branchId = branchId;

    const todayStart = startOfDay(new Date());
    const todayWhere = { ...where, createdAt: { gte: todayStart } };

    const [totalOrders, pendingOrders, completedToday, todayRevenue] = await Promise.all([
      db.order.count({ where: todayWhere }),
      db.order.count({
        where: {
          ...todayWhere,
          status: { in: [OrderStatus.NEW, OrderStatus.IN_PROGRESS, OrderStatus.READY] },
        },
      }),
      db.order.count({
        where: { ...where, status: OrderStatus.COMPLETED, updatedAt: { gte: todayStart } },
      }),
      db.order.aggregate({
        where: { ...where, status: OrderStatus.COMPLETED, updatedAt: { gte: todayStart } },
        _sum: { total: true },
      }),
    ]);

    return {
      data: {
        totalOrders,
        pendingOrders,
        completedToday,
        todayRevenue: Number(todayRevenue._sum.total || 0),
      },
    };
  } catch (error) {
    console.error("[getOrderStats] Error:", error);
    return { data: { totalOrders: 0, pendingOrders: 0, completedToday: 0, todayRevenue: 0 } };
  }
}
