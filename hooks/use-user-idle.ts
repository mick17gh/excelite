"use client";

import { useEffect, useRef, useState } from "react";
import { SESSION_IDLE_ACTIVITY_EVENTS } from "@/lib/session-idle";

/**
 * True after `idleAfterMs` with no user activity.
 * Activity resets the timer. Only re-renders when idle flips true/false.
 */
export function useUserIdle(idleAfterMs: number | null): boolean {
  const [isIdle, setIsIdle] = useState(false);
  const isIdleRef = useRef(false);

  useEffect(() => {
    if (idleAfterMs == null || idleAfterMs <= 0) {
      isIdleRef.current = false;
      setIsIdle(false);
      return;
    }
    if (typeof window === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const arm = () => {
      if (timer != null) clearTimeout(timer);
      timer = setTimeout(() => {
        isIdleRef.current = true;
        setIsIdle(true);
      }, idleAfterMs);
    };

    const onActivity = () => {
      if (isIdleRef.current) {
        isIdleRef.current = false;
        setIsIdle(false);
      }
      arm();
    };

    isIdleRef.current = false;
    setIsIdle(false);
    arm();

    for (const event of SESSION_IDLE_ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      if (timer != null) clearTimeout(timer);
      for (const event of SESSION_IDLE_ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [idleAfterMs]);

  return isIdle;
}
