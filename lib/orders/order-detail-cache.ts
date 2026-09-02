"use client";

import { getOrderById } from "@/lib/actions/orders";

export interface UiOrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  menuItemSku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes: string | null;
  configurationLabel?: string | null;
  configurationKey?: string | null;
  menuItemOptionIds?: string[];
}

export interface UiOrder {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  branchId: string;
  branchName: string;
  branchCode: string;
  taxInclusive?: boolean;
  showTaxOnReceipt?: boolean;
  taxNumber?: string | null;
  showTaxNumberOnReceipt?: boolean;
  taxName?: string;
  taxRate?: number;
  taxEnabled?: boolean;
  assignedBy: string | null;
  placedBy?: string | null;
  tableLabel?: string | null;
  tableSection?: string | null;
  tableCovers?: number | null;
  tableWaiter?: string | null;
  source: string;
  type: string;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string | null;
  paymentStatus: string;
  paystackEnabled?: boolean;
  notes: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryNeighborhood?: string | null;
  deliveryPhone: string | null;
  deliveryNotes: string | null;
  orderReceivedTime?: string | null;
  deliveryStatus: string | null;
  items: UiOrderItem[];
  payments: {
    id: string;
    reference: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    paymentMethod?: string | null;
    paidAt: string | null;
  }[];
  notifications: {
    id: string;
    orderId: string;
    type: string;
    channel: string;
    recipient: string;
    subject: string | null;
    message: string;
    status: string;
    sentAt: string | null;
    error: string | null;
    createdAt: string;
  }[];
  receipt: {
    id: string;
    orderId: string;
    receiptNumber: string;
    customerName: string;
    customerPhone: string | null;
    customerEmail: string | null;
    items: { name: string; sku: string; quantity: number; unitPrice: number; lineTotal: number }[];
    subtotal: number;
    tax: number;
    discount: number;
    deliveryFee: number;
    total: number;
    paymentMethod: string;
    pdfUrl: string | null;
    sentVia: string[];
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderById>>["data"]>;

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { data: UiOrder; fetchedAt: number }>();
const inflight = new Map<string, Promise<UiOrder | null>>();

export function mapOrderDetailToUiOrder(detail: OrderDetail): UiOrder {
  return {
    id: detail.id,
    orderNumber: detail.orderNumber,
    customerId: detail.customerId,
    customerName: detail.customer?.name ?? null,
    customerPhone: detail.customer?.phone ?? detail.deliveryPhone ?? null,
    branchId: detail.branchId,
    branchName: detail.branch?.name ?? "",
    branchCode: detail.branch?.code ?? "",
    taxInclusive: detail.branch?.taxInclusive ?? false,
    showTaxOnReceipt: detail.branch?.showTaxOnReceipt ?? true,
    taxNumber: detail.branch?.taxNumber ?? null,
    showTaxNumberOnReceipt: detail.branch?.showTaxNumberOnReceipt ?? false,
    taxName: detail.branch?.taxName || "VAT",
    taxRate: detail.branch?.taxRate != null ? Number(detail.branch.taxRate) : 0,
    taxEnabled: detail.branch?.taxEnabled ?? true,
    assignedBy: detail.assignedBy,
    placedBy: detail.placedBy,
    source: detail.source,
    type: detail.type,
    status: detail.status,
    subtotal: detail.subtotal,
    tax: detail.tax,
    discount: detail.discount,
    deliveryFee: detail.deliveryFee,
    total: detail.total,
    paymentMethod: detail.paymentMethod,
    paymentStatus: detail.paymentStatus,
    paystackEnabled: detail.paystackEnabled,
    notes: detail.notes,
    deliveryAddress: detail.deliveryAddress,
    deliveryCity: detail.deliveryCity,
    deliveryNeighborhood: detail.deliveryNeighborhood ?? null,
    deliveryPhone: detail.deliveryPhone,
    deliveryNotes: detail.deliveryNotes ?? null,
    orderReceivedTime: detail.orderReceivedTime ?? null,
    deliveryStatus: detail.delivery?.status ?? null,
    items: detail.items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      menuItemName: item.menuItem?.name ?? "",
      menuItemSku: item.menuItem?.sku ?? "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      notes: item.notes,
      configurationLabel: item.configurationLabel,
      configurationKey: item.configurationKey,
      menuItemOptionIds: item.menuItemOptionIds,
    })),
    payments: detail.payments.map((p) => ({
      id: p.id,
      reference: p.reference,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      provider: p.provider,
      paymentMethod: p.paymentMethod,
      paidAt: p.paidAt,
    })),
    notifications: detail.notifications,
    receipt: detail.receipt,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

export async function fetchOrderDetail(
  id: string,
  force = false,
): Promise<UiOrder | null> {
  if (!force) {
    const cached = cache.get(id);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.data;
    }
    const pending = inflight.get(id);
    if (pending) return pending;
  }

  const promise = (async () => {
    const result = await getOrderById(id);
    if (!result.data) return null;
    const mapped = mapOrderDetailToUiOrder(result.data);
    cache.set(id, { data: mapped, fetchedAt: Date.now() });
    return mapped;
  })();

  inflight.set(id, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(id);
  }
}

export function prefetchOrderDetail(id: string) {
  void fetchOrderDetail(id);
}

export function invalidateOrderDetail(id: string) {
  cache.delete(id);
}
