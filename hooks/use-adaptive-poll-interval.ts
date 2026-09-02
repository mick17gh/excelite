"use client";

import { useEffect, useState } from "react";

type AdaptivePollOptions = {
  baseMs: number;
  moderateMultiplier?: number;
  slowMultiplier?: number;
};

function readEffectiveNetworkType(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
    ?.effectiveType;
}

export function computeAdaptivePollInterval(
  baseMs: number,
  options?: Pick<AdaptivePollOptions, "moderateMultiplier" | "slowMultiplier">,
): number | null {
  if (typeof navigator !== "undefined" && !navigator.onLine) return null;

  const moderateMultiplier = options?.moderateMultiplier ?? 1.5;
  const slowMultiplier = options?.slowMultiplier ?? 3;
  const networkType = readEffectiveNetworkType();

  if (networkType === "slow-2g" || networkType === "2g") {
    return Math.round(baseMs * slowMultiplier);
  }
  if (networkType === "3g") {
    return Math.round(baseMs * moderateMultiplier);
  }
  return baseMs;
}

/** Lengthens interval on slow networks; null when offline. Pair with useIntervalWhenVisible. */
export function useAdaptivePollInterval({
  baseMs,
  moderateMultiplier = 1.5,
  slowMultiplier = 3,
}: AdaptivePollOptions): number | null {
  const [delayMs, setDelayMs] = useState<number | null>(() =>
    computeAdaptivePollInterval(baseMs, { moderateMultiplier, slowMultiplier }),
  );

  useEffect(() => {
    const refresh = () => {
      setDelayMs(computeAdaptivePollInterval(baseMs, { moderateMultiplier, slowMultiplier }));
    };

    refresh();
    if (typeof window === "undefined") return;

    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
    connection?.addEventListener?.("change", refresh);

    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      connection?.removeEventListener?.("change", refresh);
    };
  }, [baseMs, moderateMultiplier, slowMultiplier]);

  return delayMs;
}
