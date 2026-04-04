import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "gymflow-offline";
const DB_VERSION = 2;

export type SyncStatus = "synced" | "pending" | "failed";

export type OfflineMember = {
  id: string;
  name: string;
  phone: string;
  card_code: string | null;
  photo_path: string | null;
  gender: "male" | "female";
  access_tier: string;
  address: string | null;
  created_at: number;
  updated_at: number;
  sync_status?: SyncStatus;
  source_operation_id?: string | null;
  last_error?: string | null;
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

export type OfflineSubscription = {
  id: number;
  member_id: string;
  member_name: string | null;
  renewed_from_subscription_id: number | null;
  start_date: number;
  end_date: number;
  plan_months: number;
  price_paid: number | null;
  sessions_per_month: number | null;
  is_active: boolean;
  created_at: number;
  sync_status?: SyncStatus;
  source_operation_id?: string | null;
  last_error?: string | null;
};

export type OfflineFreeze = {
  id: number;
  subscription_id: number;
  start_date: number;
  end_date: number;
  days: number;
  created_at: number;
  sync_status?: SyncStatus;
  source_operation_id?: string | null;
  last_error?: string | null;
};

export type OfflinePayment = {
  id: number;
  member_id: string;
  amount: number;
  type: "subscription" | "renewal" | "guest_pass" | "other";
  subscription_id: number | null;
  guest_pass_id: string | null;
  note: string | null;
  created_at: string;
  sync_status?: SyncStatus;
  source_operation_id?: string | null;
  last_error?: string | null;
};

export type OfflineAttendanceLog = {
  id: string;
  member_id: string | null;
  member_name: string | null;
  scanned_value: string;
  method: "scan" | "manual" | "camera";
  timestamp: number;
  status: "success" | "failure";
  reason_code: string;
  sync_status?: SyncStatus;
  operation_id?: string | null;
  source?: "server" | "offline";
};

export type OfflineSettings = {
  key: string;
  value: unknown;
};

export type QueuedCheckIn = {
  operationId: string;
  branchId: string;
  scannedValue: string;
  method: "scan" | "manual" | "camera";
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

export type OfflineOperationStatus = "pending" | "syncing" | "synced" | "failed";

export type MemberCreatePayload = {
  member: Omit<OfflineMember, "sync_status" | "source_operation_id" | "last_error">;
};

export type MemberUpdatePayload = {
  memberId: string;
  patch: Partial<Pick<OfflineMember, "name" | "phone" | "gender" | "access_tier" | "card_code" | "address" | "photo_path">>;
  baseUpdatedAt: number | null;
  photoDataUrl?: string | null;
};

export type SubscriptionCreatePayload = {
  tempId: number;
  memberId: string;
  memberName: string | null;
  startDate: number;
  planMonths: number;
  pricePaid: number | null;
  sessionsPerMonth: number | null;
  expectedActiveSubscriptionId: number | null;
};

export type SubscriptionRenewPayload = {
  tempId: number;
  memberId: string;
  memberName: string | null;
  previousSubscriptionId: number;
  expectedPreviousEndDate: number;
  expectedPreviousIsActive: boolean;
  planMonths: number;
  pricePaid: number | null;
  sessionsPerMonth: number | null;
};

export type SubscriptionFreezePayload = {
  tempId: number;
  subscriptionId: number;
  startDate: number;
  days: number;
  expectedSubscriptionEndDate: number;
};

export type OfflineOperation =
  | {
      operationId: string;
      kind: "member_create";
      branchId: string;
      organizationId: string;
      actorId: string;
      actorRole: string;
      deviceId: string;
      offlineTimestamp: number;
      payload: MemberCreatePayload;
      status: OfflineOperationStatus;
      retries: number;
      lastError?: string;
      createdAt: number;
      updatedAt: number;
    }
  | {
      operationId: string;
      kind: "member_update";
      branchId: string;
      organizationId: string;
      actorId: string;
      actorRole: string;
      deviceId: string;
      offlineTimestamp: number;
      payload: MemberUpdatePayload;
      status: OfflineOperationStatus;
      retries: number;
      lastError?: string;
      createdAt: number;
      updatedAt: number;
    }
  | {
      operationId: string;
      kind: "subscription_create";
      branchId: string;
      organizationId: string;
      actorId: string;
      actorRole: string;
      deviceId: string;
      offlineTimestamp: number;
      payload: SubscriptionCreatePayload;
      status: OfflineOperationStatus;
      retries: number;
      lastError?: string;
      createdAt: number;
      updatedAt: number;
    }
  | {
      operationId: string;
      kind: "subscription_renew";
      branchId: string;
      organizationId: string;
      actorId: string;
      actorRole: string;
      deviceId: string;
      offlineTimestamp: number;
      payload: SubscriptionRenewPayload;
      status: OfflineOperationStatus;
      retries: number;
      lastError?: string;
      createdAt: number;
      updatedAt: number;
    }
  | {
      operationId: string;
      kind: "subscription_freeze";
      branchId: string;
      organizationId: string;
      actorId: string;
      actorRole: string;
      deviceId: string;
      offlineTimestamp: number;
      payload: SubscriptionFreezePayload;
      status: OfflineOperationStatus;
      retries: number;
      lastError?: string;
      createdAt: number;
      updatedAt: number;
    };

export type SyncMeta = {
  key: string;
  value: unknown;
};

const STORE_NAMES = [
  "members",
  "settings",
  "checkin_queue",
  "sync_meta",
  "subscriptions",
  "subscription_freezes",
  "payments",
  "attendance_logs",
  "operations"
] as const;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getOfflineDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("members")) {
          const memberStore = db.createObjectStore("members", { keyPath: "id" });
          memberStore.createIndex("by_phone", "phone");
          memberStore.createIndex("by_card_code", "card_code");
        }

        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }

        if (!db.objectStoreNames.contains("checkin_queue")) {
          const queueStore = db.createObjectStore("checkin_queue", { keyPath: "operationId" });
          queueStore.createIndex("by_status", "status");
          queueStore.createIndex("by_created", "createdAt");
        }

        if (!db.objectStoreNames.contains("sync_meta")) {
          db.createObjectStore("sync_meta", { keyPath: "key" });
        }

        if (!db.objectStoreNames.contains("subscriptions")) {
          const store = db.createObjectStore("subscriptions", { keyPath: "id" });
          store.createIndex("by_member", "member_id");
          store.createIndex("by_created", "created_at");
        }

        if (!db.objectStoreNames.contains("subscription_freezes")) {
          const store = db.createObjectStore("subscription_freezes", { keyPath: "id" });
          store.createIndex("by_subscription", "subscription_id");
          store.createIndex("by_created", "created_at");
        }

        if (!db.objectStoreNames.contains("payments")) {
          const store = db.createObjectStore("payments", { keyPath: "id" });
          store.createIndex("by_member", "member_id");
          store.createIndex("by_created", "created_at");
        }

        if (!db.objectStoreNames.contains("attendance_logs")) {
          const store = db.createObjectStore("attendance_logs", { keyPath: "id" });
          store.createIndex("by_member", "member_id");
          store.createIndex("by_timestamp", "timestamp");
        }

        if (!db.objectStoreNames.contains("operations")) {
          const store = db.createObjectStore("operations", { keyPath: "operationId" });
          store.createIndex("by_status", "status");
          store.createIndex("by_created", "createdAt");
          store.createIndex("by_kind", "kind");
        }
      }
    });
  }
  return dbPromise;
}

export async function clearOfflineData() {
  const db = await getOfflineDb();
  const tx = db.transaction(STORE_NAMES as unknown as string[], "readwrite");
  await Promise.all([
    tx.objectStore("members").clear(),
    tx.objectStore("settings").clear(),
    tx.objectStore("checkin_queue").clear(),
    tx.objectStore("sync_meta").clear(),
    tx.objectStore("subscriptions").clear(),
    tx.objectStore("subscription_freezes").clear(),
    tx.objectStore("payments").clear(),
    tx.objectStore("attendance_logs").clear(),
    tx.objectStore("operations").clear(),
    tx.done
  ]);
}
