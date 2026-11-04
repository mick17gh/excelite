"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { PublicStoreConfig } from "@/lib/storefront/config";
import { StorefrontChrome } from "@/components/storefront/storefront-chrome";

type Props = { organizationId: string };

type TrackData = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  orderType: string;
  branch: { id: string; name: string };
  timeline: Array<{ code: string; reached: boolean }>;
};

const LABEL: Record<string, string> = {
  NEW: "Received",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Completed",
};

export function StorefrontTrackPage({ organizationId }: Props) {
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<PublicStoreConfig | null>(null);
  const [orderNumber, setOrderNumber] = useState(searchParams.get("orderNumber") || "");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrackData | null>(null);

  useEffect(() => {
    void fetch(`/api/public/store/${organizationId}/config`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setConfig(json.data as PublicStoreConfig);
      });
  }, [organizationId]);

  useEffect(() => {
    if (searchParams.get("orderNumber") && searchParams.get("phone")) {
      void lookup(searchParams.get("orderNumber")!, searchParams.get("phone")!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(nextOrder = orderNumber, nextPhone = phone) {
    if (!nextOrder.trim() || !nextPhone.trim()) {
      setError("Order number and phone are required");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(
        `/api/public/orders/${encodeURIComponent(nextOrder.trim())}/track?phone=${encodeURIComponent(nextPhone.trim())}`,
      );
      const json = await res.json();
      if (!res.ok) {
        setError("Could not find that order. Check the number and phone.");
        return;
      }
      setData(json.data as TrackData);
    } catch {
      setError("Could not find that order. Check the number and phone.");
    } finally {
      setLoading(false);
    }
  }

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  const primary = String(config.theme?.primary || "#0f766e");

  return (
    <StorefrontChrome config={config}>
      <div className="mx-auto max-w-md space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Track order</h1>
          <p className="text-sm text-slate-500">Enter your order number and the phone used at checkout.</p>
        </div>

        <form
          className="space-y-3 rounded-2xl border bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void lookup();
          }}
        >
          <input
            className="h-11 w-full rounded-xl border px-3 text-sm"
            placeholder="Order number"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
          />
          <input
            className="h-11 w-full rounded-xl border px-3 text-sm"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: primary }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Track
          </button>
        </form>

        {data ? (
          <div className="space-y-4 rounded-2xl border bg-white p-4">
            <div>
              <p className="font-mono text-sm font-medium">{data.orderNumber}</p>
              <p className="text-sm text-slate-500">
                {data.branch.name} · {data.orderType} · Payment {data.paymentStatus}
              </p>
            </div>
            <ol className="space-y-3">
              {data.timeline.map((step) => (
                <li key={step.code} className="flex items-center gap-3 text-sm">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${step.reached ? "" : "bg-slate-200"}`}
                    style={step.reached ? { background: primary } : undefined}
                  />
                  <span className={step.reached ? "font-medium text-slate-900" : "text-slate-400"}>
                    {LABEL[step.code] || step.code}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </StorefrontChrome>
  );
}
