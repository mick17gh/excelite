import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";

// GET /api/v1/customers - List/search customers
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "customers:read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "100");
  const offset = parseInt(searchParams.get("offset") || "0");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 500),
      skip: offset,
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

  return NextResponse.json({
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
      lifetimeValue: lifetimeValueMap.get(c.id) || 0,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    })),
    pagination: { total, limit, offset, hasMore: offset + customers.length < total },
  });
}

// POST /api/v1/customers - Create customer
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "customers:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phone, email, address, city, location, customerVibe, specialNotes } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
    }

    const existing = await db.customer.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json({ error: "Customer with this phone already exists" }, { status: 409 });
    }

    const customer = await db.customer.create({
      data: {
        name,
        phone,
        email: email || null,
        address: address || null,
        city: city || location || null,
        location: location || city || null,
        customerVibe: customerVibe || null,
        specialNotes: specialNotes || null,
      },
    });

    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/v1/customers] Error:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
