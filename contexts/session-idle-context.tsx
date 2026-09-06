"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useUserIdle } from "@/hooks/use-user-idle";
import {
  SESSION_IDLE_LOGOUT_MS,
  SESSION_IDLE_PAUSE_POLLS_MS,
} from "@/lib/session-idle";

type SessionIdleContextValue = {
  /** True after pause threshold — non-live polls should stop. */
  pausePolling: boolean;
  /** Combine with other gates for useIntervalWhenVisible `enabled`. */
  pollingEnabled: (extra?: boolean) => boolean;
};

const SessionIdleContext = createContext<SessionIdleContextValue | null>(null);

type SessionIdleProviderProps = {
  children: React.ReactNode;
  /** Stop non-live polls after this idle. `null` disables. */
  pausePollsAfterMs?: number | null;
  /** Sign out after this idle. `null` disables. */
  logoutAfterMs?: number | null;
};

export function SessionIdleProvider({
  children,
  pausePollsAfterMs = SESSION_IDLE_PAUSE_POLLS_MS,
  logoutAfterMs = SESSION_IDLE_LOGOUT_MS,
}: SessionIdleProviderProps) {
  const router = useRouter();
  const signingOutRef = useRef(false);
  const pausePolling = useUserIdle(pausePollsAfterMs ?? null);
  const logoutIdle = useUserIdle(logoutAfterMs ?? null);

  useEffect(() => {
    if (!logoutIdle || signingOutRef.current) return;
    signingOutRef.current = true;
    void (async () => {
      try {
        await authClient.signOut();
        toast.message("Signed out due to inactivity");
        router.push("/login");
      } catch (error) {
        console.error("[SessionIdle] sign-out failed:", error);
        signingOutRef.current = false;
      }
    })();
  }, [logoutIdle, router]);

  const pollingEnabled = useCallback(
    (extra = true) => extra && !pausePolling,
    [pausePolling],
  );

  const value = useMemo(
    () => ({ pausePolling, pollingEnabled }),
    [pausePolling, pollingEnabled],
  );

  return (
    <SessionIdleContext.Provider value={value}>{children}</SessionIdleContext.Provider>
  );
}

export function useSessionIdle(): SessionIdleContextValue {
  const ctx = useContext(SessionIdleContext);
  if (!ctx) {
    throw new Error("useSessionIdle must be used within SessionIdleProvider");
  }
  return ctx;
}

/** Safe outside provider (e.g. kitchen live board without idle logout). */
export function useSessionIdleOptional(): SessionIdleContextValue | null {
  return useContext(SessionIdleContext);
}

/** Gate polls: respects idle pause when provider is present. */
export function usePollingEnabled(extra = true): boolean {
  const idle = useSessionIdleOptional();
  if (!idle) return extra;
  return idle.pollingEnabled(extra);
}
