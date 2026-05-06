import type { CreatePosOrderInput } from "@/lib/actions/pos";

/** Queued checkout replayed to POST /api/pos/offline-sync */
export type PosOfflineSyncPayload = {
  create: CreatePosOrderInput;
  amountReceived: number;
  tip?: number;
  skipStatusComplete: boolean;
};

export type PosOutboxRecord = {
  clientMutationId: string;
  createdAt: number;
  payload: PosOfflineSyncPayload;
};

export type PosSnapshotV1 = {
  schemaVersion: 1;
  savedAt: number;
  branches: unknown;
  menuItems: unknown;
  recentOrders: unknown;
  customers: unknown;
};
