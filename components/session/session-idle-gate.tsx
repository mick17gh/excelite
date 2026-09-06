"use client";

import { SessionIdleProvider } from "@/contexts/session-idle-context";

/** Client boundary for dashboard/POS idle pause + logout. */
export function SessionIdleGate({ children }: { children: React.ReactNode }) {
  return <SessionIdleProvider>{children}</SessionIdleProvider>;
}
