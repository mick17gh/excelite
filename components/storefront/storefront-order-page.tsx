"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { PublicStoreConfig } from "@/lib/storefront/config";
import { StorefrontChrome } from "@/components/storefront/storefront-chrome";

type Props = {
  organizationId: string;
  orderNumber: string;
};

export function StorefrontOrderPage({ organizationId, orderNumber }: Props) {
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const paystack = searchParams.get("paystack") === "1";
  const reference = searchParams.get("reference") || searchParams.get("trxref") || "";

  const [config, setConfig] = useState<PublicStoreConfig | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/public/store/${organizationId}/config`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setConfig(json.data as PublicStoreConfig);
      })
      .catch(() => setError("Failed to load store"));
  }, [organizationId]);

  useEffect(() => {
    if (!paystack || !reference) return;
    let cancelled = false;
    async function verify() {
      setVerifying(true);
      try {
        const res = await fetch(`/api/public/store/${organizationId}/payments/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Payment verification failed");
          setPaymentStatus("FAILED");
          return;
        }
        setPaymentStatus(json.data?.status || json.data?.paymentStatus || "PAID");
      } catch {
        if (!cancelled) {
          setError("Payment verification failed");
          setPaymentStatus("FAILED");
        }
      } finally {
        if (!cancelled) setVerifying(false);
      }
    }
    void verify();
    return () => {
      cancelled = true;
    };
  }, [paystack, reference, organizationId]);

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  const primary = String(config.theme?.primary || "#0066FF");
  const trackHref = `/track?orderNumber=${encodeURIComponent(orderNumber)}${
    phone ? `&phone=${encodeURIComponent(phone)}` : ""
  }`;

  return (
    <StorefrontChrome config={config}>
      <div className="mx-auto max-w-md space-y-4 rounded-3xl border bg-white p-6 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12" style={{ color: primary }} />
        <h1 className="text-2xl font-semibold tracking-tight">Order received</h1>
        <p className="text-sm text-slate-600">
          Order <span className="font-mono font-medium text-slate-900">{orderNumber}</span>
        </p>

        {verifying ? (
          <p className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Confirming payment…
          </p>
        ) : null}

        {paymentStatus ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
            Payment status: <strong>{paymentStatus}</strong>
          </p>
        ) : !paystack ? (
          <p className="text-sm text-slate-600">
            Pay when you pick up or on delivery. Staff will confirm your order.
          </p>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex flex-col gap-2 pt-2">
          <Link
            href={trackHref}
            className="rounded-xl px-4 py-3 text-sm font-semibold text-white"
            style={{ background: primary }}
          >
            Track this order
          </Link>
          <Link href="/" className="text-sm font-medium text-slate-600 underline">
            Back to menu
          </Link>
        </div>
      </div>
    </StorefrontChrome>
  );
}
