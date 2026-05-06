import { listPosOutbox, removePosOutbox } from "@/lib/offline/pos-idb";

/**
 * POST each pending outbox item to the server. Safe to call repeatedly.
 */
export async function drainPosOutbox(): Promise<{ synced: number; failed: number }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const items = await listPosOutbox();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const res = await fetch("/api/pos/offline-sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientMutationId: item.clientMutationId,
          payload: item.payload,
        }),
      });

      if (res.ok) {
        await removePosOutbox(item.clientMutationId);
        synced += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return { synced, failed };
}
