"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Loader2, Lock } from "lucide-react";
import type { PublicStoreBranch, PublicStoreConfig } from "@/lib/storefront/config";
import { cn } from "@/lib/utils";
import {
  cartItemsSubtotal,
  clearStorefrontCart,
  lineUnitTotal,
  loadStorefrontCart,
  type StorefrontCartLine,
} from "@/lib/storefront/cart-storage";
import { buildPaystackCallbackUrl } from "@/lib/storefront/paystack-callback";
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
} from "@/lib/storefront/whatsapp-order-message";
import { StorefrontChrome } from "@/components/storefront/storefront-chrome";

type Props = { organizationId: string };

type CheckoutMethod = "CASH" | "WHATSAPP" | "PAYSTACK";

export function StorefrontCheckout({ organizationId }: Props) {
  const router = useRouter();
  const [config, setConfig] = useState<PublicStoreConfig | null>(null);
  const [cart, setCart] = useState<StorefrontCartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState("");
  const [orderType, setOrderType] = useState<"TAKEOUT" | "DELIVERY">("TAKEOUT");
  const [method, setMethod] = useState<CheckoutMethod>("CASH");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setCart(loadStorefrontCart(organizationId));
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/store/${organizationId}/config`);
        const json = await res.json();
        // 503 still returns config (closed / outside hours).
        if (!json.data) throw new Error(json.error || "Store unavailable");
        if (cancelled) return;
        const cfg = json.data as PublicStoreConfig;
        setConfig(cfg);
        setBranchId(cfg.branches[0]?.id || "");
        if (cfg.features.cashEnabled) setMethod("CASH");
        else if (cfg.features.whatsappOrderingEnabled) setMethod("WHATSAPP");
        else if (cfg.features.paystackEnabled) setMethod("PAYSTACK");
        if (!cfg.features.pickupEnabled && cfg.features.deliveryEnabled) {
          setOrderType("DELIVERY");
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const branch = useMemo(
    () => config?.branches.find((b) => b.id === branchId),
    [config, branchId],
  );
  const currency = branch?.currency || config?.checkout.currency || "GHS";
  const itemsTotal = cartItemsSubtotal(cart);
  const deliveryFee =
    orderType === "DELIVERY" ? Number(config?.checkout.deliveryFee || 0) : 0;
  const taxRate = branch?.taxRate ?? config?.checkout.taxRate ?? 0;
  const taxInclusive = branch?.taxInclusive ?? config?.checkout.taxInclusive ?? false;
  const taxAmount = taxInclusive
    ? itemsTotal - itemsTotal / (1 + taxRate)
    : itemsTotal * taxRate;
  const amount = taxInclusive ? itemsTotal + deliveryFee : itemsTotal + taxAmount + deliveryFee;
  const primary = String(config?.theme?.primary || "#0f766e");
  const canOrder = Boolean(config?.status.enabled && config.status.isOpenNow);

  const methods: { id: CheckoutMethod; label: string; hint: string }[] = [];
  if (config?.features.cashEnabled) {
    methods.push({ id: "CASH", label: "Pay at pickup / delivery", hint: "Staff will confirm payment manually." });
  }
  if (config?.features.whatsappOrderingEnabled) {
    methods.push({ id: "WHATSAPP", label: "Order via WhatsApp", hint: "We open WhatsApp with your cart. No online order is created." });
  }
  if (config?.features.paystackEnabled) {
    methods.push({ id: "PAYSTACK", label: "Pay with card", hint: "Secure Paystack checkout." });
  }

  const hasBranch = Boolean(branch);
  const canSubmit =
    Boolean(config) &&
    hasBranch &&
    cart.length > 0 &&
    canOrder &&
    methods.length > 0 &&
    !submitting;

  async function submit() {
    if (!config || cart.length === 0) return;
    if (!branch) {
      setError("No branch available for online orders");
      return;
    }
    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required");
      return;
    }
    if (orderType === "DELIVERY" && !address.trim()) {
      setError("Delivery address is required");
      return;
    }
    if (!canOrder) {
      setError(config.status.closedReason || "Store is closed");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      if (method === "WHATSAPP") {
        const message = buildWhatsAppOrderMessage({
          storeName: config.store.name,
          orderType: orderType === "DELIVERY" ? "Delivery" : "Pickup",
          branchName: `${branch.name}${branch.code ? ` - ${branch.code}` : ""}`,
          items: cart.map((line) => ({
            quantity: line.quantity,
            name: line.name,
            optionsLabel: line.options.map((o) => o.name).join(", ") || null,
            lineTotal: lineUnitTotal(line) * line.quantity,
          })),
          itemsTotal,
          taxIncludedAmount: taxInclusive && taxAmount > 0 ? taxAmount : null,
          amount,
          currency,
          customerName: name.trim(),
          customerPhone: phone.trim(),
        });
        const url = buildWhatsAppOrderUrl(config.contact.whatsapp || "", message);
        if (!url) throw new Error("WhatsApp number is not configured");
        clearStorefrontCart(organizationId);
        window.location.href = url;
        return;
      }

      const orderRes = await fetch(`/api/public/store/${organizationId}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          branchId,
          orderType: orderType === "DELIVERY" ? "DELIVERY" : "TAKEOUT",
          items: cart.map((line) => ({
            menuItemId: line.menuItemId,
            quantity: line.quantity,
            menuItemOptionIds: line.options.map((o) => o.optionId),
            notes: line.notes,
          })),
          customerInfo: {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
          },
          deliveryDetails:
            orderType === "DELIVERY"
              ? { address: address.trim(), notes: notes.trim() || undefined }
              : undefined,
          paymentMethod: method === "PAYSTACK" ? "PAYSTACK" : "CASH",
          notes: notes.trim() || undefined,
        }),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderJson.error || "Failed to place order");

      const orderNumber = orderJson.data.orderNumber as string;

      if (method === "PAYSTACK") {
        const callbackUrl = buildPaystackCallbackUrl(window.location.origin, orderNumber);
        const payRes = await fetch(`/api/public/store/${organizationId}/payments/initialize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderNumber,
            email: email.trim() || `${phone.trim().replace(/\D/g, "")}@orders.local`,
            callbackUrl,
          }),
        });
        const payJson = await payRes.json();
        if (!payRes.ok) throw new Error(payJson.error || "Failed to start payment");
        clearStorefrontCart(organizationId);
        window.location.href = payJson.data.authorizationUrl;
        return;
      }

      clearStorefrontCart(organizationId);
      const trackPhone = encodeURIComponent(phone.trim());
      router.push(`/order/${orderNumber}?phone=${trackPhone}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-slate-600">
        {error || "Store unavailable"}
      </div>
    );
  }

  return (
    <StorefrontChrome config={config}>
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
          <p className="text-sm text-slate-500">Confirm your details and place the order.</p>
        </div>

        {cart.length === 0 ? (
          <p className="rounded-2xl border bg-white p-4 text-sm text-slate-600">
            Your cart is empty. <a href="/" className="underline" style={{ color: primary }}>Browse the menu</a>
          </p>
        ) : (
          <>
            <section className="space-y-3 rounded-2xl border bg-white p-4">
              <BranchPicker
                branches={config.branches}
                branchId={branchId}
                onChange={setBranchId}
                primary={primary}
              />

              <div className="flex gap-2">
                {config.features.pickupEnabled ? (
                  <button
                    type="button"
                    onClick={() => setOrderType("TAKEOUT")}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
                      orderType === "TAKEOUT" ? "text-white" : "bg-slate-50 ring-1 ring-slate-200"
                    }`}
                    style={orderType === "TAKEOUT" ? { background: primary } : undefined}
                  >
                    Pickup
                  </button>
                ) : null}
                {config.features.deliveryEnabled ? (
                  <button
                    type="button"
                    onClick={() => setOrderType("DELIVERY")}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
                      orderType === "DELIVERY" ? "text-white" : "bg-slate-50 ring-1 ring-slate-200"
                    }`}
                    style={orderType === "DELIVERY" ? { background: primary } : undefined}
                  >
                    Delivery
                  </button>
                ) : null}
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border bg-white p-4">
              <input
                className="h-11 w-full rounded-xl border px-3 text-sm"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="h-11 w-full rounded-xl border px-3 text-sm"
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <input
                className="h-11 w-full rounded-xl border px-3 text-sm"
                placeholder="Email (optional, required for card)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {orderType === "DELIVERY" ? (
                <textarea
                  className="min-h-24 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="Delivery address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              ) : null}
              <textarea
                className="min-h-20 w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </section>

            <section className="space-y-2 rounded-2xl border bg-white p-4">
              <p className="text-sm font-medium">Payment</p>
              {methods.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${
                    method === m.id ? "border-transparent ring-2" : ""
                  }`}
                  style={method === m.id ? { boxShadow: `0 0 0 2px ${primary}` } : undefined}
                >
                  <input
                    type="radio"
                    name="method"
                    checked={method === m.id}
                    onChange={() => setMethod(m.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium">{m.label}</span>
                    <span className="text-xs text-slate-500">{m.hint}</span>
                  </span>
                </label>
              ))}
            </section>

            <section className="rounded-2xl border bg-white p-4 text-sm">
              <div className="flex justify-between py-1">
                <span>Items</span>
                <span>
                  {currency} {itemsTotal.toFixed(2)}
                </span>
              </div>
              {taxInclusive && taxAmount > 0 ? (
                <div className="flex justify-between py-1 text-slate-500">
                  <span>Tax included</span>
                  <span>
                    {currency} {taxAmount.toFixed(2)}
                  </span>
                </div>
              ) : null}
              {!taxInclusive && taxAmount > 0 ? (
                <div className="flex justify-between py-1">
                  <span>Tax</span>
                  <span>
                    {currency} {taxAmount.toFixed(2)}
                  </span>
                </div>
              ) : null}
              {deliveryFee > 0 ? (
                <div className="flex justify-between py-1">
                  <span>Delivery</span>
                  <span>
                    {currency} {deliveryFee.toFixed(2)}
                  </span>
                </div>
              ) : null}
              <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
                <span>Amount</span>
                <span>
                  {currency} {amount.toFixed(2)}
                </span>
              </div>
            </section>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void submit()}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: primary }}
              title={
                !hasBranch
                  ? "No branch available for online orders"
                  : !canOrder
                    ? config.status.closedReason || "Store is closed"
                    : methods.length === 0
                      ? "No payment method available"
                      : undefined
              }
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {!hasBranch
                ? "No branch available"
                : method === "WHATSAPP"
                  ? "Send on WhatsApp"
                  : method === "PAYSTACK"
                    ? "Pay with Paystack"
                    : "Place order"}
            </button>
          </>
        )}
      </div>
    </StorefrontChrome>
  );
}

function BranchPicker({
  branches,
  branchId,
  onChange,
  primary,
}: {
  branches: PublicStoreBranch[];
  branchId: string;
  onChange: (id: string) => void;
  primary: string;
}) {
  if (branches.length === 0) {
    return (
      <div>
        <p className="mb-2 text-sm font-medium text-[#222831]">Location</p>
        <div
          className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3.5 py-3 text-sm text-amber-900"
          role="status"
        >
          No branch available for online orders. Enable a branch under Branches → Online store.
        </div>
      </div>
    );
  }

  if (branches.length === 1) {
    const only = branches[0];
    return (
      <div>
        <p className="mb-2 text-sm font-medium text-[#222831]">Location</p>
        <div
          className="flex items-center gap-3 rounded-xl border border-[#222831]/10 bg-slate-50 px-3.5 py-3"
          aria-readonly="true"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ background: primary }}
          >
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#222831]">{only.name}</p>
            {only.code ? (
              <p className="truncate text-xs text-slate-500">{only.code}</p>
            ) : null}
          </div>
          <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[#222831]">Pickup location</p>
      <div className="grid gap-2" role="radiogroup" aria-label="Branch">
        {branches.map((b) => {
          const selected = b.id === branchId;
          return (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(b.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition",
                selected
                  ? "shadow-sm"
                  : "border-[#222831]/10 bg-white hover:border-[#222831]/20 hover:bg-slate-50",
              )}
              style={
                selected
                  ? {
                      borderColor: primary,
                      background: `${primary}14`,
                      boxShadow: `0 0 0 1px ${primary}`,
                    }
                  : undefined
              }
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  selected ? "text-white" : "bg-slate-100 text-slate-600",
                )}
                style={selected ? { background: primary } : undefined}
              >
                <Building2 className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#222831]">
                  {b.name}
                </span>
                {b.code ? (
                  <span className="block truncate text-xs text-slate-500">{b.code}</span>
                ) : null}
              </span>
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-transparent text-white" : "border-slate-300 text-transparent",
                )}
                style={selected ? { background: primary } : undefined}
                aria-hidden
              >
                <Check className="h-3 w-3" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
