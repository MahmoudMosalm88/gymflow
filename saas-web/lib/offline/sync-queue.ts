/**
 * Sync queue for offline check-ins stored in IndexedDB.
 */

import { getOfflineDb, type QueuedCheckIn } from "./db";

export async function enqueue(item: QueuedCheckIn): Promise<void> {
  const db = await getOfflineDb();
  await db.put("checkin_queue", item);
}

export async function getPendingItems(): Promise<QueuedCheckIn[]> {
  const db = await getOfflineDb();
  const all = await db.getAllFromIndex("checkin_queue", "by_status", "pending");
  // Sort by creation time (FIFO)
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function markSyncing(operationId: string): Promise<void> {
  const db = await getOfflineDb();
  const item = await db.get("checkin_queue", operationId);
  if (item) {
    item.status = "syncing";
    item.updatedAt = Math.floor(Date.now() / 1000);
    await db.put("checkin_queue", item);
  }
}

export async function markSynced(operationId: string): Promise<void> {
  const db = await getOfflineDb();
  const item = await db.get("checkin_queue", operationId);
  if (item) {
    item.status = "synced";
    item.updatedAt = Math.floor(Date.now() / 1000);
    await db.put("checkin_queue", item);
  }
}

export async function markFailed(operationId: string, error: string): Promise<void> {
  const db = await getOfflineDb();
  const item = await db.get("checkin_queue", operationId);
  if (item) {
    item.status = "failed";
    item.retries += 1;
    item.lastError = error;
    item.updatedAt = Math.floor(Date.now() / 1000);
    await db.put("checkin_queue", item);
  }
}

export async function resetFailedToPending(operationId: string): Promise<void> {
  const db = await getOfflineDb();
  const item = await db.get("checkin_queue", operationId);
  if (item && item.status === "failed") {
    item.status = "pending";
    item.updatedAt = Math.floor(Date.now() / 1000);
    await db.put("checkin_queue", item);
  }
}

export async function getPendingCount(): Promise<number> {
  const db = await getOfflineDb();
  return db.countFromIndex("checkin_queue", "by_status", "pending");
}

export async function getFailedCount(): Promise<number> {
  const db = await getOfflineDb();
  return db.countFromIndex("checkin_queue", "by_status", "failed");
}

export async function getSyncingCount(): Promise<number> {
  const db = await getOfflineDb();
  return db.countFromIndex("checkin_queue", "by_status", "syncing");
}
