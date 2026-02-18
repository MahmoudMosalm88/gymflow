/**
 * IndexedDB layer for offline check-in data.
 * Uses the `idb` library for a promise-based API.
 */

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "gymflow-offline";
const DB_VERSION = 1;

export type OfflineMember = {
  id: string;
  name: string;
  phone: string;
  card_code: string | null;
  gender: "male" | "female";
  subscription: {
    id: number;
    start_date: number;
    end_date: number;
    sessions_per_month: number | null;
    is_active: boolean;
  } | null;
  quota: {
    sessions_used: number;
    sessions_cap: number;
    cycle_start: number;
    cycle_end: number;
  } | null;
  last_success_timestamp: number | null;
};

export type OfflineSettings = {
  key: string;
  value: unknown;
};

export type QueuedCheckIn = {
  operationId: string;
  branchId: string;
  scannedValue: string;
  method: "scan" | "manual";
  offlineTimestamp: number;
  deviceId: string;
  memberId: string;
  memberName: string;
  status: "pending" | "syncing" | "synced" | "failed";
  retries: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
};

export type SyncMeta = {
  key: string;
  value: unknown;
};

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getOfflineDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Members store — keyed by member ID
        if (!db.objectStoreNames.contains("members")) {
          const memberStore = db.createObjectStore("members", { keyPath: "id" });
          memberStore.createIndex("by_phone", "phone");
          memberStore.createIndex("by_card_code", "card_code");
        }

        // Settings store — keyed by setting key
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }

        // Check-in queue — keyed by operationId
        if (!db.objectStoreNames.contains("checkin_queue")) {
          const queueStore = db.createObjectStore("checkin_queue", { keyPath: "operationId" });
          queueStore.createIndex("by_status", "status");
          queueStore.createIndex("by_created", "createdAt");
        }

        // Sync metadata — key-value store
        if (!db.objectStoreNames.contains("sync_meta")) {
          db.createObjectStore("sync_meta", { keyPath: "key" });
        }
      }
    });
  }
  return dbPromise;
}

/** Clear all offline data (call on logout). */
export async function clearOfflineData() {
  const db = await getOfflineDb();
  const tx = db.transaction(["members", "settings", "checkin_queue", "sync_meta"], "readwrite");
  await Promise.all([
    tx.objectStore("members").clear(),
    tx.objectStore("settings").clear(),
    tx.objectStore("checkin_queue").clear(),
    tx.objectStore("sync_meta").clear(),
    tx.done
  ]);
}
