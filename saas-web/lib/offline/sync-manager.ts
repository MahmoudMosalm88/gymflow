/**
 * Sync manager: drains the offline check-in queue when online.
 * Uses BroadcastChannel to prevent multiple tabs from syncing simultaneously.
 */

import { api } from "@/lib/api-client";
import { getPendingItems, markSyncing, markSynced, markFailed } from "./sync-queue";

const SYNC_INTERVAL_MS = 30_000; // 30 seconds
const LOCK_CHANNEL = "gymflow-sync-lock";

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;
let isLeader = false;
let channel: BroadcastChannel | null = null;
let onlineHandler: (() => void) | null = null;

/** Process one queued item. Returns true if synced successfully. */
async function syncItem(item: {
  operationId: string;
  scannedValue: string;
  method: string;
  offlineTimestamp: number;
  deviceId: string;
}): Promise<boolean> {
  try {
    await markSyncing(item.operationId);

    const res = await api.post("/api/attendance/check", {
      scannedValue: item.scannedValue,
      method: item.method,
      operationId: item.operationId,
      source: "offline_sync",
      offlineTimestamp: item.offlineTimestamp,
      deviceId: item.deviceId
    });

    // Any successful response (including idempotent replay) = mark synced
    if (res.data) {
      await markSynced(item.operationId);
      return true;
    }

    await markFailed(item.operationId, "Unexpected empty response");
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";

    // Network errors are retriable — keep as pending
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch")) {
      // Revert to pending for next attempt
      const { getOfflineDb } = await import("./db");
      const db = await getOfflineDb();
      const stored = await db.get("checkin_queue", item.operationId);
      if (stored) {
        stored.status = "pending";
        stored.retries += 1;
        stored.updatedAt = Math.floor(Date.now() / 1000);
        await db.put("checkin_queue", stored);
      }
      return false;
    }

    // Non-retriable error
    await markFailed(item.operationId, msg);
    return false;
  }
}

/** Drain all pending items in FIFO order. */
async function drainQueue() {
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;

  try {
    const pending = await getPendingItems();

    for (const item of pending) {
      if (!navigator.onLine) break; // Stop if we go offline mid-sync
      const success = await syncItem(item);
      if (!success && !navigator.onLine) break; // Network error + offline = stop
    }
  } finally {
    isSyncing = false;
  }
}

/** Elect a leader tab using BroadcastChannel. */
function setupLeaderElection() {
  if (typeof BroadcastChannel === "undefined") {
    // Fallback: assume leader if BroadcastChannel not available
    isLeader = true;
    return;
  }

  channel = new BroadcastChannel(LOCK_CHANNEL);
  isLeader = true;

  channel.onmessage = (event) => {
    if (event.data === "claim") {
      // Another tab is claiming leadership — yield if we haven't started syncing
      if (!isSyncing) {
        isLeader = false;
      }
    }
  };

  // Claim leadership
  channel.postMessage("claim");
}

/** Start the sync manager. Call once on dashboard mount. */
export function startSyncManager() {
  if (syncTimer) return; // Already running

  setupLeaderElection();

  // Sync immediately if online
  if (navigator.onLine && isLeader) {
    drainQueue();
  }

  // Periodic sync
  syncTimer = setInterval(() => {
    if (navigator.onLine && isLeader) {
      drainQueue();
    }
  }, SYNC_INTERVAL_MS);

  // Sync when coming back online
  onlineHandler = () => {
    if (isLeader) drainQueue();
  };
  window.addEventListener("online", onlineHandler);
}

/** Stop the sync manager. */
export function stopSyncManager() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  if (channel) {
    channel.close();
    channel = null;
  }
  if (onlineHandler) {
    window.removeEventListener("online", onlineHandler);
    onlineHandler = null;
  }
  isLeader = false;
}

/** Manually trigger a sync (e.g., from a "sync now" button). */
export function triggerSync() {
  if (navigator.onLine) drainQueue();
}
