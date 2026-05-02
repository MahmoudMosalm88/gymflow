import { api } from "@/lib/api-client";
import { getAttendanceLog, putAttendanceLog } from "./cache";
import { fetchAndStoreBundle } from "./offline-bundle";
import { getFailedOperations, getPendingOperations, markOperationFailed, markOperationPending, markOperationSynced, markOperationSyncing } from "./operations";
import { getPendingItems, markFailed, markSyncing, markSynced } from "./sync-queue";

const SYNC_INTERVAL_MS = 30_000;
const LEASE_KEY = "gymflow-sync-leader-lease";
const LEASE_TTL_MS = 45_000;
const LEASE_HEARTBEAT_MS = 15_000;

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;
let isLeader = false;
let onlineHandler: (() => void) | null = null;
let leaseTimer: ReturnType<typeof setInterval> | null = null;
const leaseId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `lease-${Date.now()}`;

function isNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("Failed to fetch") ||
    message.includes("NetworkError")
  );
}

async function markAttendanceLogStatus(operationId: string, syncStatus: "pending" | "failed" | "synced", reasonCode?: string) {
  const log = await getAttendanceLog(operationId);
  if (!log) return;
  await putAttendanceLog({
    ...log,
    sync_status: syncStatus,
    reason_code: reasonCode || log.reason_code,
  });
}

async function syncCheckInItem(item: {
  operationId: string;
  scannedValue: string;
  method: string;
  offlineTimestamp: number;
  deviceId: string;
}): Promise<boolean> {
  try {
    await markSyncing(item.operationId);
    await markAttendanceLogStatus(item.operationId, "pending");

    const res = await api.post("/api/attendance/check", {
      scannedValue: item.scannedValue,
      method: item.method,
      operationId: item.operationId,
      source: "offline_sync",
      offlineTimestamp: item.offlineTimestamp,
      deviceId: item.deviceId
    });

    if (res.data) {
      await markSynced(item.operationId);
      await markAttendanceLogStatus(item.operationId, "synced");
      return true;
    }

    await markFailed(item.operationId, "Unexpected empty response");
    await markAttendanceLogStatus(item.operationId, "failed", "sync_failed");
    return false;
  } catch (error) {
    if (isNetworkError(error)) {
      const { getOfflineDb } = await import("./db");
      const db = await getOfflineDb();
      const stored = await db.get("checkin_queue", item.operationId);
      if (stored) {
        stored.status = "pending";
        stored.retries += 1;
        stored.updatedAt = Math.floor(Date.now() / 1000);
        await db.put("checkin_queue", stored);
      }
      await markAttendanceLogStatus(item.operationId, "pending");
      return false;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    await markFailed(item.operationId, message);
    await markAttendanceLogStatus(item.operationId, "failed", "sync_failed");
    return false;
  }
}

type LeaseRecord = {
  owner: string;
  expiresAt: number;
};

function readLease(): LeaseRecord | null {
  try {
    const raw = localStorage.getItem(LEASE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LeaseRecord;
  } catch {
    return null;
  }
}

function writeLease(record: LeaseRecord) {
  localStorage.setItem(LEASE_KEY, JSON.stringify(record));
}

function refreshLeadership() {
  const now = Date.now();
  const current = readLease();
  if (!current || current.expiresAt <= now || current.owner === leaseId) {
    writeLease({ owner: leaseId, expiresAt: now + LEASE_TTL_MS });
    isLeader = true;
    return;
  }
  isLeader = false;
}

function releaseLeadership() {
  const current = readLease();
  if (current?.owner === leaseId) {
    localStorage.removeItem(LEASE_KEY);
  }
  isLeader = false;
}

async function syncOperation(operation: Awaited<ReturnType<typeof getPendingOperations>>[number]): Promise<boolean> {
  try {
    await markOperationSyncing(operation.operationId);

    switch (operation.kind) {
      case "member_create": {
        const existing = await api.get(`/api/members/${operation.payload.member.id}`).catch(() => null);
        if (existing?.success && existing.data) {
          await markOperationSynced(operation.operationId);
          return true;
        }

        const { member } = operation.payload;
        const response = await api.post("/api/members", {
          id: member.id,
          name: member.name,
          phone: member.phone,
          gender: member.gender,
          access_tier: member.access_tier,
          card_code: member.card_code,
          address: member.address,
          photo_path: member.photo_path,
        });
        if (!response.success) throw new Error(response.message || "Failed to create member.");
        await markOperationSynced(operation.operationId);
        return true;
      }

      case "member_update": {
        const current = await api.get<{ updated_at?: number | string }>(`/api/members/${operation.payload.memberId}`);
        if (!current.success || !current.data) throw new Error(current.message || "Member not found.");
        const serverUpdatedAtRaw = current.data.updated_at;
        const serverUpdatedAt = typeof serverUpdatedAtRaw === "number"
          ? serverUpdatedAtRaw
          : typeof serverUpdatedAtRaw === "string"
            ? Math.floor(new Date(serverUpdatedAtRaw).getTime() / 1000)
            : null;

        if (operation.payload.baseUpdatedAt && serverUpdatedAt && serverUpdatedAt !== operation.payload.baseUpdatedAt) {
          throw new Error("Another device changed this member before sync. Review the member update.");
        }

        if (operation.payload.photoDataUrl) {
          const response = await fetch(operation.payload.photoDataUrl);
          const blob = await response.blob();
          const file = new File([blob], "offline-member-photo.jpg", { type: blob.type || "image/jpeg" });
          const body = new FormData();
          body.append("photo", file);
          if (operation.payload.baseUpdatedAt !== null) {
            body.append("base_updated_at", String(operation.payload.baseUpdatedAt));
          }
          const uploadRes = await api.postFormData(`/api/members/${operation.payload.memberId}/photo`, body);
          if (!uploadRes.success) {
            throw new Error(uploadRes.message || "Failed to upload member photo.");
          }
        }

        const patch = { ...operation.payload.patch };
        delete patch.photo_path;
        if (Object.keys(patch).length > 0) {
          const response = await api.patch(`/api/members/${operation.payload.memberId}`, {
            ...patch,
            base_updated_at: operation.payload.baseUpdatedAt,
          });
          if (!response.success) throw new Error(response.message || "Failed to update member.");
        }

        await markOperationSynced(operation.operationId);
        return true;
      }

      case "subscription_create": {
        const response = await api.post("/api/subscriptions", {
          member_id: operation.payload.memberId,
          start_date: operation.payload.startDate,
          plan_months: operation.payload.planMonths,
          price_paid: operation.payload.pricePaid,
          payment_method: operation.payload.paymentMethod,
          sessions_per_month: operation.payload.sessionsPerMonth,
          source: "offline_sync",
          expected_active_subscription_id: operation.payload.expectedActiveSubscriptionId,
        });
        if (!response.success) throw new Error(response.message || "Failed to create subscription.");
        await markOperationSynced(operation.operationId);
        return true;
      }

      case "subscription_renew": {
        const response = await api.post("/api/subscriptions/renew", {
          member_id: operation.payload.memberId,
          previous_subscription_id: operation.payload.previousSubscriptionId,
          source: "offline_sync",
          expected_previous_end_date: operation.payload.expectedPreviousEndDate,
          expected_previous_is_active: operation.payload.expectedPreviousIsActive,
          plan_months: operation.payload.planMonths,
          price_paid: operation.payload.pricePaid,
          payment_method: operation.payload.paymentMethod,
          sessions_per_month: operation.payload.sessionsPerMonth,
        });
        if (!response.success) throw new Error(response.message || "Failed to renew subscription.");
        await markOperationSynced(operation.operationId);
        return true;
      }

      case "subscription_freeze": {
        const response = await api.post(`/api/subscriptions/${operation.payload.subscriptionId}/freeze`, {
          startDate: operation.payload.startDate,
          days: operation.payload.days,
          expected_subscription_end_date: operation.payload.expectedSubscriptionEndDate,
        });
        if (!response.success) throw new Error(response.message || "Failed to freeze subscription.");
        await markOperationSynced(operation.operationId);
        return true;
      }
    }
  } catch (error) {
    if (isNetworkError(error)) {
      await markOperationPending(operation.operationId);
      return false;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    await markOperationFailed(operation.operationId, message);
    return false;
  }
}

async function drainQueue() {
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;

  let changedServerState = false;

  try {
    const pendingCheckIns = await getPendingItems();
    for (const item of pendingCheckIns) {
      if (!navigator.onLine) break;
      const success = await syncCheckInItem(item);
      if (success) changedServerState = true;
      if (!success && !navigator.onLine) break;
    }

    const pendingOperations = await getPendingOperations();
    for (const operation of pendingOperations) {
      if (!navigator.onLine) break;
      const success = await syncOperation(operation);
      if (success) changedServerState = true;
      if (!success && !navigator.onLine) break;
    }

    if (changedServerState && navigator.onLine) {
      await fetchAndStoreBundle();
    }
  } finally {
    isSyncing = false;
  }
}

export function startSyncManager() {
  if (syncTimer) return;
  refreshLeadership();

  if (navigator.onLine && isLeader) {
    void drainQueue();
  }

  syncTimer = setInterval(() => {
    refreshLeadership();
    if (navigator.onLine && isLeader) {
      void drainQueue();
    }
  }, SYNC_INTERVAL_MS);

  leaseTimer = setInterval(() => {
    refreshLeadership();
  }, LEASE_HEARTBEAT_MS);

  onlineHandler = () => {
    refreshLeadership();
    if (isLeader) void drainQueue();
  };
  window.addEventListener("online", onlineHandler);
}

export function stopSyncManager() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  if (leaseTimer) {
    clearInterval(leaseTimer);
    leaseTimer = null;
  }
  if (onlineHandler) {
    window.removeEventListener("online", onlineHandler);
    onlineHandler = null;
  }
  releaseLeadership();
}

export function triggerSync() {
  if (navigator.onLine) {
    void drainQueue();
  }
}

export async function getReviewQueueSummary() {
  const [failedOperations] = await Promise.all([getFailedOperations()]);
  return failedOperations.map((item) => ({
    id: item.operationId,
    kind: item.kind,
    message: item.lastError || "Sync failed.",
    updatedAt: item.updatedAt,
  }));
}
