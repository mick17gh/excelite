import { db } from "@/lib/db";
import { SalesChannel } from "@/lib/generated/prisma/client";
import { logCreate } from "@/lib/services/audit";
import { createDeliveryRequest } from "@/lib/actions/delivery";
import { sendPaymentReceiptSMS } from "@/lib/services/sms-notifications";
import { deductInventoryForSale } from "@/lib/services/inventory-deduction";
import { closeTableSessionIfAllOrdersPaid } from "@/lib/features/table-session-lifecycle";
import {
  cashChangeFromTenders,
  orderPaymentMethodFromTenders,
  roundMoney,
  sumTenderAmounts,
  totalCashReceived,
  validateTenders,
  type PaymentTender,
} from "@/lib/payments/tenders";

type OrderWithItems = Awaited<ReturnType<typeof loadOrderForSettlement>>;

async function resolveTransactionStaffId(
  cashierUserId: string | null | undefined,
  branchId: string,
): Promise<string | null> {
  if (!cashierUserId) return null;

  const existingStaff = await db.staff.findFirst({
    where: { id: cashierUserId, branchId, deletedAt: null },
    select: { id: true },
  });
  if (existingStaff) return existingStaff.id;

  const cashierUser = await db.user.findUnique({
    where: { id: cashierUserId },
    select: { email: true },
  });
  if (!cashierUser?.email) return null;

  const staffByEmail = await db.staff.findFirst({
    where: {
      branchId,
      email: cashierUser.email,
      deletedAt: null,
      isActive: true,
    },
    select: { id: true },
  });
  return staffByEmail?.id ?? null;
}

function generatePaymentRef(): string {
  return `PAY-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function generateTransactionRef(): string {
  return `TXN-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function generateSaleNumber(): string {
  return `SALE-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
}

function resolveDayPart(): "BREAKFAST" | "LUNCH" | "DINNER" | "LATE_NIGHT" {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return "BREAKFAST";
  if (hour >= 11 && hour < 15) return "LUNCH";
  if (hour >= 15 && hour < 21) return "DINNER";
  return "LATE_NIGHT";
}

async function loadOrderForSettlement(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          menuItem: true,
          selections: { select: { menuItemOptionId: true } },
        },
      },
    },
  });
}

export interface SettleOrderWithTendersInput {
  orderId: string;
  tenders: PaymentTender[];
  tip?: number;
  createSale?: boolean;
  skipStatusComplete?: boolean;
  paymentProvider?: "pos" | "manual";
}

export interface SettleOrderResult {
  orderId: string;
  orderNumber: string;
  total: number;
  tip: number;
  totalWithTip: number;
  amountReceived: number;
  change: number;
  paymentMethod: string;
  saleId: string | null;
}

export async function settleOrderWithTenders(
  input: SettleOrderWithTendersInput,
): Promise<{ success: true; data: SettleOrderResult } | { success: false; error: string }> {
  try {
    const order = await loadOrderForSettlement(input.orderId);
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    const tip = input.tip ?? 0;
    const orderTotal = roundMoney(Number(order.total));
    const expectedTotal = roundMoney(orderTotal + tip);

    if (order.status !== "COMPLETED" && order.paymentStatus !== "PAID") {
      const { assertCartStockAvailable } = await import(
        "@/lib/services/menu-stock-availability"
      );
      const stockCheck = await assertCartStockAvailable(
        order.branchId,
        order.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          menuItemOptionIds: item.selections?.map((s) => s.menuItemOptionId) || [],
          menuItemName: item.menuItem?.name,
        })),
      );
      if (!stockCheck.ok) {
        return { success: false, error: stockCheck.error };
      }
    }

    const validation = validateTenders(expectedTotal, input.tenders);
    if (!validation.ok) {
      return { success: false, error: validation.error };
    }

    const paymentMethod = orderPaymentMethodFromTenders(input.tenders);
    const amountReceived = totalCashReceived(input.tenders);
    const change = cashChangeFromTenders(input.tenders);

    if (order.status === "COMPLETED" || order.paymentStatus === "PAID") {
      if (order.tableSessionId) {
        await closeTableSessionIfAllOrdersPaid(order.tableSessionId, order.branchId);
      }
      return {
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          total: orderTotal,
          tip,
          totalWithTip: expectedTotal,
          amountReceived,
          change,
          paymentMethod: order.paymentMethod || paymentMethod,
          saleId: null,
        },
      };
    }

    const orderStatus = input.skipStatusComplete ? "IN_PROGRESS" : "COMPLETED";
    const provider = input.paymentProvider ?? "pos";
    const transactionStaffId = await resolveTransactionStaffId(
      order.cashierId,
      order.branchId,
    );

    let saleId: string | null = null;
    let firstTransactionId: string | null = null;

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: orderStatus,
          paymentMethod,
          paymentStatus: "PAID",
          ...(orderStatus === "COMPLETED" ? { closedAt: new Date() } : {}),
        },
      });

      for (const tender of input.tenders) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            reference: generatePaymentRef(),
            amount: tender.amount,
            status: "PAID",
            provider,
            paymentMethod: tender.method,
            providerRef: tender.reference?.trim() || null,
            paidAt: new Date(),
          },
        });

        const transaction = await tx.transaction.create({
          data: {
            transactionRef: generateTransactionRef(),
            branchId: order.branchId,
            staffId: transactionStaffId,
            paymentMethod: tender.method,
            amount: tender.amount,
            tip: 0,
            transactionDate: new Date(),
          },
        });
        if (!firstTransactionId) firstTransactionId = transaction.id;
      }

      if (input.createSale !== false && firstTransactionId) {
        const channelMap: Record<string, SalesChannel> = {
          DINE_IN: "DINE_IN",
          TAKEOUT: "TAKEOUT",
          DELIVERY: "DELIVERY",
          APP: "APP",
        };
        const channel = channelMap[order.type] || "DINE_IN";

        const allOptionIds = order.items.flatMap(
          (i) => i.selections?.map((s) => s.menuItemOptionId) || [],
        );
        const optionRows = allOptionIds.length
          ? await tx.menuItemOption.findMany({
              where: { id: { in: allOptionIds } },
              select: { id: true, costDelta: true },
            })
          : [];
        const optCostDelta = new Map(
          optionRows.map((o) => [o.id, o.costDelta != null ? Number(o.costDelta) : 0]),
        );

        const sale = await tx.sale.create({
          data: {
            saleNumber: generateSaleNumber(),
            branchId: order.branchId,
            transactionId: firstTransactionId,
            subtotal: order.subtotal,
            tax: order.tax,
            total: order.total,
            channel,
            dayPart: resolveDayPart(),
            customerCount: 1,
            saleDate: new Date(),
            items: {
              create: order.items.map((item) => {
                const oids = item.selections?.map((s) => s.menuItemOptionId) || [];
                const optionCostSum = oids.reduce(
                  (s, id) => s + (optCostDelta.get(id) || 0),
                  0,
                );
                const unitCost =
                  Math.round(
                    ((item.menuItem?.cost ? Number(item.menuItem.cost) : 0) + optionCostSum) *
                      100,
                  ) / 100;
                return {
                  menuItemId: item.menuItemId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  unitCost,
                  total: item.lineTotal,
                  discount: 0,
                  configurationLabel: item.configurationLabel,
                  configurationKey: item.configurationKey,
                  selections:
                    oids.length > 0
                      ? { create: oids.map((menuItemOptionId) => ({ menuItemOptionId })) }
                      : undefined,
                };
              }),
            },
          },
        });
        saleId = sale.id;
      }
    });

    if (order.tableSessionId) {
      await closeTableSessionIfAllOrdersPaid(order.tableSessionId, order.branchId);
    }

    if (saleId) {
      await logCreate("Sale", saleId, {
        saleNumber: saleId,
        orderId: order.id,
        branchId: order.branchId,
        total: orderTotal,
        paymentMethod,
      });

      try {
        await deductInventoryForSale(
          order.items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            menuItemOptionIds: item.selections?.map((s) => s.menuItemOptionId) || [],
          })),
          order.branchId,
          order.id,
        );
      } catch (err) {
        console.warn("[settleOrderWithTenders] Inventory deduction failed:", err);
      }
    }

    try {
      await sendPaymentReceiptSMS(order.id);
    } catch (err) {
      console.warn("[settleOrderWithTenders] Failed to send payment receipt SMS:", err);
    }

    if (order.type === "DELIVERY") {
      try {
        await createDeliveryRequest({
          orderId: order.id,
          deliveryAddress: order.deliveryAddress || undefined,
          deliveryPhone: order.deliveryPhone || undefined,
          customerName: order.customerName || undefined,
          fee: Number(order.deliveryFee) || 0,
          notes: order.deliveryNotes || undefined,
        });
      } catch (err) {
        console.warn("[settleOrderWithTenders] Failed to create delivery request:", err);
      }
    }

    return {
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: orderTotal,
        tip,
        totalWithTip: expectedTotal,
        amountReceived,
        change,
        paymentMethod,
        saleId,
      },
    };
  } catch (error) {
    console.error("[settleOrderWithTenders] Error:", error);
    return { success: false, error: "Failed to complete order" };
  }
}

/** Finalize dashboard order when payment rows already exist. */
export async function finalizeOrderFromExistingPayments(
  orderId: string,
): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          menuItem: { select: { cost: true, name: true } },
          selections: { select: { menuItemOptionId: true } },
        },
      },
      payments: { where: { status: "PAID" } },
    },
  });

  if (!order) return;

  const totalPaid = roundMoney(
    order.payments.reduce((sum, p) => sum + Number(p.amount), 0),
  );
  if (totalPaid < roundMoney(Number(order.total))) return;

  const methods = [
    ...new Set(
      order.payments
        .map((p) => p.paymentMethod || p.provider)
        .filter(Boolean) as string[],
    ),
  ];
  const paymentMethod =
    methods.length === 1 ? methods[0] : methods.length > 1 ? "SPLIT" : "manual";

  const alreadyPaid = order.paymentStatus === "PAID";
  await db.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "PAID",
      paymentMethod,
      orderReceivedTime: order.orderReceivedTime || new Date(),
    },
  });

  if (alreadyPaid) {
    if (order.tableSessionId) {
      await closeTableSessionIfAllOrdersPaid(order.tableSessionId, order.branchId);
    }
    return;
  }

  const transactionStaffId = await resolveTransactionStaffId(
    order.cashierId,
    order.branchId,
  );

  let firstTransactionId: string | null = null;
  for (const payment of order.payments) {
    const method =
      payment.paymentMethod ||
      (payment.provider === "momo"
        ? "MOBILE_MONEY"
        : payment.provider === "cash"
          ? "CASH"
          : payment.provider === "card"
            ? "CARD"
            : payment.provider === "bank_transfer"
              ? "BANK_TRANSFER"
              : payment.provider.toUpperCase());

    const transaction = await db.transaction.create({
      data: {
        transactionRef: generateTransactionRef(),
        branchId: order.branchId,
        staffId: transactionStaffId,
        paymentMethod: method,
        amount: Number(payment.amount),
        tip: 0,
        transactionDate: new Date(),
      },
    });
    if (!firstTransactionId) firstTransactionId = transaction.id;
  }

  const channelMap: Record<string, SalesChannel> = {
    DINE_IN: "DINE_IN",
    TAKEOUT: "TAKEOUT",
    DELIVERY: "DELIVERY",
    APP: "APP",
  };
  const channel = channelMap[order.type] || "DINE_IN";

  const { assertCartStockAvailable } = await import(
    "@/lib/services/menu-stock-availability"
  );
  const stockCheck = await assertCartStockAvailable(
    order.branchId,
    order.items.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      menuItemOptionIds: item.selections?.map((s) => s.menuItemOptionId) || [],
      menuItemName: item.menuItem?.name,
    })),
  );
  if (!stockCheck.ok) {
    console.warn("[finalizeOrderFromExistingPayments] Stock check failed:", stockCheck.error);
    return;
  }

  const allOptionIds = order.items.flatMap(
    (i) => i.selections?.map((s) => s.menuItemOptionId) || [],
  );
  const optionRows = allOptionIds.length
    ? await db.menuItemOption.findMany({
        where: { id: { in: allOptionIds } },
        select: { id: true, costDelta: true },
      })
    : [];
  const optCostDelta = new Map(
    optionRows.map((o) => [o.id, o.costDelta != null ? Number(o.costDelta) : 0]),
  );

  if (firstTransactionId) {
    await db.sale.create({
      data: {
        saleNumber: generateSaleNumber(),
        branchId: order.branchId,
        transactionId: firstTransactionId,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        channel,
        dayPart: resolveDayPart(),
        customerCount: 1,
        saleDate: new Date(),
        items: {
          create: order.items.map((item) => {
            const oids = item.selections?.map((s) => s.menuItemOptionId) || [];
            const optionCostSum = oids.reduce(
              (s, id) => s + (optCostDelta.get(id) || 0),
              0,
            );
            const unitCost =
              Math.round(
                ((item.menuItem?.cost ? Number(item.menuItem.cost) : 0) + optionCostSum) *
                  100,
              ) / 100;
            return {
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost,
              total: item.lineTotal,
              discount: 0,
              configurationLabel: item.configurationLabel,
              configurationKey: item.configurationKey,
              selections:
                oids.length > 0
                  ? { create: oids.map((menuItemOptionId) => ({ menuItemOptionId })) }
                  : undefined,
            };
          }),
        },
      },
    });
  }

  try {
    await deductInventoryForSale(
      order.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        menuItemOptionIds: item.selections?.map((s) => s.menuItemOptionId) || [],
      })),
      order.branchId,
      order.id,
    );
  } catch (err) {
    console.warn("[finalizeOrderFromExistingPayments] Inventory deduction failed:", err);
  }

  try {
    await sendPaymentReceiptSMS(order.id);
  } catch (err) {
    console.warn("[finalizeOrderFromExistingPayments] SMS failed:", err);
  }

  if (order.tableSessionId) {
    await closeTableSessionIfAllOrdersPaid(order.tableSessionId, order.branchId);
  }
}

export { sumTenderAmounts };
