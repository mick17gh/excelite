import type { PosOutboxRecord, PosSnapshotV1 } from "@/lib/offline/pos-types";

const DB_NAME = "excelite-pos-offline";
const DB_VERSION = 1;
const STORE_SNAPSHOT = "snapshot";
const STORE_OUTBOX = "outbox";
const SNAPSHOT_KEY = "latest";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SNAPSHOT)) {
        db.createObjectStore(STORE_SNAPSHOT);
      }
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { keyPath: "clientMutationId" });
      }
    };
  });
}

export async function savePosSnapshot(
  snapshot: Pick<PosSnapshotV1, "branches" | "menuItems" | "recentOrders" | "customers">,
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  const payload: PosSnapshotV1 = {
    schemaVersion: 1,
    savedAt: Date.now(),
    branches: snapshot.branches,
    menuItems: snapshot.menuItems,
    recentOrders: snapshot.recentOrders,
    customers: snapshot.customers,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOT, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("snapshot write failed"));
    tx.objectStore(STORE_SNAPSHOT).put(payload, SNAPSHOT_KEY);
  });
  db.close();
}

export async function loadPosSnapshot(): Promise<PosSnapshotV1 | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  const row = await new Promise<PosSnapshotV1 | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOT, "readonly");
    const req = tx.objectStore(STORE_SNAPSHOT).get(SNAPSHOT_KEY);
    req.onsuccess = () => resolve(req.result as PosSnapshotV1 | undefined);
    req.onerror = () => reject(req.error ?? new Error("snapshot read failed"));
  });
  db.close();
  if (!row || row.schemaVersion !== 1) return null;
  return row;
}

export async function enqueuePosOutbox(record: PosOutboxRecord): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("outbox write failed"));
    tx.objectStore(STORE_OUTBOX).put(record);
  });
  db.close();
}

export async function listPosOutbox(): Promise<PosOutboxRecord[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  const rows = await new Promise<PosOutboxRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, "readonly");
    const req = tx.objectStore(STORE_OUTBOX).getAll();
    req.onsuccess = () => resolve((req.result as PosOutboxRecord[]) || []);
    req.onerror = () => reject(req.error ?? new Error("outbox read failed"));
  });
  db.close();
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removePosOutbox(clientMutationId: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("outbox delete failed"));
    tx.objectStore(STORE_OUTBOX).delete(clientMutationId);
  });
  db.close();
}
