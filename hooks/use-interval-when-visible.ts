"use client";

import { useEffect, useRef } from "react";

/**
 * Interval only while document is visible.
 * Hidden tabs: timer stopped.
 * Become visible: immediate callback, then resume.
 * Does not fire on mount — fetch initial data separately.
 * Pass delayMs=null to disable (e.g. offline).
 */
export function useIntervalWhenVisible(
  callback: () => void,
  delayMs: number | null,
  enabled = true,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled || delayMs == null || delayMs < 0) return;
    if (typeof document === "undefined") return;

    let id: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      if (document.visibilityState === "hidden") return;
      callbackRef.current();
    };

    const start = () => {
      if (id != null) return;
      id = setInterval(tick, delayMs);
    };

    const stop = () => {
      if (id == null) return;
      clearInterval(id);
      id = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        stop();
        return;
      }
      callbackRef.current();
      start();
    };

    if (document.visibilityState !== "hidden") {
      start();
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [delayMs, enabled]);
}
