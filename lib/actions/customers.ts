"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  location?: string;
  customerVibe?: "VIP" | "SPECIAL" | "FLAGGED" | "LARGE_ORDER" | "FOB";
  specialNotes?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateCustomerInput {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  location?: string;
  customerVibe?: "VIP" | "SPECIAL" | "FLAGGED" | "LARGE_ORDER" | "FOB" | null;
  specialNotes?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

export type PosCustomerCacheItem = {
  id: string;
  name: string;
  phone: string;
};

/** Slim active-customer list for POS seed / offline IndexedDB cache. */
export async function getPosCustomerCache() {
  try {
    const customers = await db.customer.findMany({
      where: { isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
    });
    return {
      data: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
      })) satisfies PosCustomerCacheItem[],
    };
  } catch (error) {
    console.error("[getPosCustomerCache] Error:", error);
    return { data: [] as PosCustomerCacheItem[] };
  }
}

export async function getCustomers(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
  activeOnly?: boolean;
}) {
  try {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 100;

    const where: Record<string, unknown> = {};

    if (filters?.activeOnly) {
      where.isActive = true;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { location: { contains: filters.search, mode: "insensitive" } },
        { city: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        include: {
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      db.customer.count({ where }),
    ]);

    const lifetimeValueRows = await db.order.groupBy({
      by: ["customerId"],
      where: {
        customerId: { in: customers.map((c) => c.id) },
        paymentStatus: "PAID",
      },
      _sum: { total: true },
    });
    const lifetimeValueMap = new Map(
      lifetimeValueRows.map((row) => [row.customerId, Number(row._sum.total || 0)]),
    );

    return {
      data: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        city: c.city,
        location: c.location || c.city,
        customerVibe: c.customerVibe,
        specialNotes: c.specialNotes,
        latitude: c.latitude ? Number(c.latitude) : null,
        longitude: c.longitude ? Number(c.longitude) : null,
        isActive: c.isActive,
        orderCount: c._count.orders,
        lifetimeValue: lifetimeValueMap.get(c.id) || 0,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("[getCustomers] Error:", error);
    return { data: [], total: 0, page: 1, pageSize: 100 };
  }
}

export async function getCustomerById(id: string) {
  try {
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            branch: { select: { name: true } },
            items: { include: { menuItem: { select: { name: true } } } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: { select: { orders: true } },
      },
    });

    if (!customer) return { data: null };

    return {
      data: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        city: customer.city,
        location: customer.location || customer.city,
        customerVibe: customer.customerVibe,
        specialNotes: customer.specialNotes,
        isActive: customer.isActive,
        orderCount: customer._count.orders,
        lifetimeValue: customer.orders
          .filter((o) => o.paymentStatus === "PAID")
          .reduce((sum, o) => sum + Number(o.total), 0),
        orders: customer.orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          branchName: o.branch?.name || "",
          status: o.status,
          total: Number(o.total),
          source: o.source,
          createdAt: o.createdAt.toISOString(),
          itemCount: o.items.length,
        })),
        createdAt: customer.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[getCustomerById] Error:", error);
    return { data: null };
  }
}

export async function createCustomer(input: CreateCustomerInput) {
  try {
    const existing = await db.customer.findUnique({ where: { phone: input.phone } });
    if (existing) {
      return { error: "A customer with this phone number already exists" };
    }

    const customer = await db.customer.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        address: input.address || null,
        city: input.city || input.location || null,
        location: input.location || input.city || null,
        customerVibe: input.customerVibe || null,
        specialNotes: input.specialNotes || null,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
      },
    });

    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard/orders");
    revalidatePath("/pos");
    return { data: customer };
  } catch (error) {
    console.error("[createCustomer] Error:", error);
    return { error: "Failed to create customer" };
  }
}

export async function updateCustomer(input: UpdateCustomerInput) {
  try {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.email !== undefined) data.email = input.email || null;
    if (input.address !== undefined) data.address = input.address || null;
    if (input.city !== undefined) data.city = input.city || null;
    if (input.location !== undefined) data.location = input.location || null;
    if (input.customerVibe !== undefined) data.customerVibe = input.customerVibe;
    if (input.specialNotes !== undefined) data.specialNotes = input.specialNotes || null;
    if (input.latitude !== undefined) data.latitude = input.latitude || null;
    if (input.longitude !== undefined) data.longitude = input.longitude || null;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const customer = await db.customer.update({
      where: { id: input.id },
      data,
    });

    revalidatePath("/dashboard/customers");
    return { data: customer };
  } catch (error) {
    console.error("[updateCustomer] Error:", error);
    return { error: "Failed to update customer" };
  }
}

export async function deleteCustomer(id: string) {
  try {
    await db.customer.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/dashboard/customers");
    return { success: true };
  } catch (error) {
    console.error("[deleteCustomer] Error:", error);
    return { error: "Failed to delete customer" };
  }
}

export async function getCustomerStats() {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, active, newThisMonth] = await Promise.all([
      db.customer.count(),
      db.customer.count({ where: { isActive: true } }),
      db.customer.count({ where: { createdAt: { gte: monthStart } } }),
    ]);

    return { data: { total, active, newThisMonth } };
  } catch (error) {
    console.error("[getCustomerStats] Error:", error);
    return { data: { total: 0, active: 0, newThisMonth: 0 } };
  }
}
