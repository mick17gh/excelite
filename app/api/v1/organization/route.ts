import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";

// GET /api/v1/organization - Get organization details
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const org = await db.organization.findFirst({
    include: {
      _count: { select: { users: true, branches: true, warehouses: true } },
      subscription: { select: { tier: true, status: true, amount: true, currency: true, billingCycle: true, nextBillingDate: true } },
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      id: org.id,
      name: org.name,
      tier: org.tier,
      status: org.status,
      maxBranches: org.maxBranches,
      maxUsers: org.maxUsers,
      maxMenuItems: org.maxMenuItems,
      userCount: org._count.users,
      branchCount: org._count.branches,
      warehouseCount: org._count.warehouses,
      subscription: org.subscription
        ? {
            tier: org.subscription.tier,
            status: org.subscription.status,
            amount: Number(org.subscription.amount),
            currency: org.subscription.currency,
            billingCycle: org.subscription.billingCycle,
            nextBillingDate: org.subscription.nextBillingDate?.toISOString() || null,
          }
        : null,
      createdAt: org.createdAt.toISOString(),
    },
  });
}

// PATCH /api/v1/organization - Update organization
export async function PATCH(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (name) data.name = name;

    const org = await db.organization.update({ where: { id }, data });

    return NextResponse.json({ data: { id: org.id, name: org.name, tier: org.tier } });
  } catch (error) {
    console.error("[PATCH /api/v1/organization] Error:", error);
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }
}
