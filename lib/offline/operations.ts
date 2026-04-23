import {
  SESSION_PROFILE_KEY,
  type AppRole,
  type SessionProfile,
} from "@/lib/session";
import {
  deleteFreeze,
  getAllOperations,
  getMember,
  getOfflineAgeSeconds,
  getOperation,
  getSubscription,
  nextLocalNumber,
  nowUnix,
  putFreeze,
  putMember,
  putOperation,
  putSubscription,
} from "./cache";
import {
  type MemberUpdatePayload,
  type OfflineFreeze,
  type OfflineMember,
  type OfflineOperation,
  type OfflineOperationStatus,
  type OfflineSubscription,
  type SubscriptionCreatePayload,
  type SubscriptionFreezePayload,
  type SubscriptionRenewPayload,
} from "./db";
import { getDeviceId } from "./device-id";
import { toSubscriptionAccessReferenceUnix } from "@/lib/subscription-dates";

function readSessionProfile(): SessionProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionProfile;
  } catch {
    return null;
  }
}

export function canWriteOffline(role: AppRole | null | undefined) {
  return role === "owner" || role === "manager" || role === "staff";
}

function toEntitySyncStatus(status: OfflineOperationStatus) {
  return status === "failed" ? "failed" : status === "synced" ? "synced" : "pending";
}

function buildOperationBase() {
  const profile = readSessionProfile();
  if (!profile || !canWriteOffline(profile.role)) {
    throw new Error("This account cannot create offline changes.");
  }

  const timestamp = nowUnix();
  return {
    operationId: crypto.randomUUID(),
    branchId: profile.branchId,
    organizationId: profile.organizationId,
    actorId: profile.id,
    actorRole: profile.role,
    deviceId: getDeviceId(),
    offlineTimestamp: timestamp,
    status: "pending" as OfflineOperationStatus,
    retries: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function applyMemberCreate(operation: Extract<OfflineOperation, { kind: "member_create" }>) {
  await putMember({
    ...operation.payload.member,
    sync_status: toEntitySyncStatus(operation.status),
    source_operation_id: operation.operationId,
    last_error: operation.lastError || null,
  });
}

async function applyMemberUpdate(operation: Extract<OfflineOperation, { kind: "member_update" }>) {
  const existing = await getMember(operation.payload.memberId);
  if (!existing) return;
  await putMember({
    ...existing,
    ...operation.payload.patch,
    updated_at: operation.offlineTimestamp,
    sync_status: toEntitySyncStatus(operation.status),
    source_operation_id: operation.operationId,
    last_error: operation.lastError || null,
  });
}

async function applySubscriptionCreateLike(
  operation:
    | Extract<OfflineOperation, { kind: "subscription_create" }>
    | Extract<OfflineOperation, { kind: "subscription_renew" }>,
) {
  const payload = operation.payload;
  const subscription: OfflineSubscription = {
    id: payload.tempId,
    member_id: payload.memberId,
    member_name: payload.memberName,
    renewed_from_subscription_id: operation.kind === "subscription_renew"
      ? operation.payload.previousSubscriptionId
      : null,
    start_date: operation.kind === "subscription_renew"
      ? operation.offlineTimestamp
      : operation.payload.startDate,
    end_date: operation.kind === "subscription_renew"
      ? operation.offlineTimestamp
      : operation.payload.startDate,
    plan_months: payload.planMonths,
    price_paid: payload.pricePaid,
    payment_method: payload.paymentMethod,
    sessions_per_month: payload.sessionsPerMonth,
    is_active: true,
    created_at: operation.offlineTimestamp,
    sync_status: toEntitySyncStatus(operation.status),
    source_operation_id: operation.operationId,
    last_error: operation.lastError || null,
  };

  if (operation.kind === "subscription_renew") {
    const existing = await getSubscription(operation.payload.previousSubscriptionId);
    const accessReference = toSubscriptionAccessReferenceUnix(operation.offlineTimestamp);
    const startDate = existing && existing.end_date > accessReference
      ? existing.end_date
      : operation.offlineTimestamp;
    subscription.start_date = startDate;
    subscription.end_date = startDate + payload.planMonths * 30 * 86400;
  } else {
    subscription.end_date = operation.payload.startDate + payload.planMonths * 30 * 86400;
  }

  await putSubscription(subscription);
}

async function applySubscriptionFreeze(operation: Extract<OfflineOperation, { kind: "subscription_freeze" }>) {
  const existing = await getSubscription(operation.payload.subscriptionId);
  if (existing) {
    await putSubscription({
      ...existing,
      end_date: existing.end_date + operation.payload.days * 86400,
      sync_status: toEntitySyncStatus(operation.status),
      source_operation_id: operation.operationId,
      last_error: operation.lastError || null,
    });
  }

  const freeze: OfflineFreeze = {
    id: operation.payload.tempId,
    subscription_id: operation.payload.subscriptionId,
    start_date: operation.payload.startDate,
    end_date: operation.payload.startDate + operation.payload.days * 86400,
    days: operation.payload.days,
    created_at: operation.offlineTimestamp,
    sync_status: toEntitySyncStatus(operation.status),
    source_operation_id: operation.operationId,
    last_error: operation.lastError || null,
  };
  await putFreeze(freeze);
}

export async function applyOperationToLocalState(operation: OfflineOperation) {
  if (operation.status === "synced") return;

  switch (operation.kind) {
    case "member_create":
      await applyMemberCreate(operation);
      break;
    case "member_update":
      await applyMemberUpdate(operation);
      break;
    case "subscription_create":
      await applySubscriptionCreateLike(operation);
      break;
    case "subscription_renew":
      await applySubscriptionCreateLike(operation);
      break;
    case "subscription_freeze":
      await applySubscriptionFreeze(operation);
      break;
  }
}

export async function replayPendingOfflineState() {
  const operations = await getAllOperations();
  const active = operations
    .filter((item) => item.status === "pending" || item.status === "failed" || item.status === "syncing")
    .sort((a, b) => a.createdAt - b.createdAt);

  for (const operation of active) {
    await applyOperationToLocalState(operation);
  }
}

export async function enqueueOperation(operation: OfflineOperation) {
  await putOperation(operation);
  await applyOperationToLocalState(operation);
}

export async function queueMemberCreate(input: {
  memberId?: string;
  name: string;
  phone: string;
  gender?: "male" | "female";
  access_tier: string;
  card_code?: string | null;
  address?: string | null;
  photo_path?: string | null;
  start_date?: number | null;
  plan_months?: number | null;
  price_paid?: number | null;
  payment_method?: "cash" | "digital" | null;
  sessions_per_month?: number | null;
}) {
  const profile = readSessionProfile();
  const memberId = input.memberId || crypto.randomUUID();
  const member: OfflineMember = {
    id: memberId,
    name: input.name,
    phone: input.phone,
    gender: input.gender || "male",
    access_tier: input.access_tier,
    card_code: input.card_code || null,
    address: input.address || null,
    photo_path: input.photo_path || null,
    created_at: nowUnix(),
    updated_at: nowUnix(),
    subscription: null,
    quota: null,
    last_success_timestamp: null,
  };

  const createOperation: OfflineOperation = {
    ...buildOperationBase(),
    kind: "member_create",
    payload: { member },
  };
  await enqueueOperation(createOperation);

  if (input.plan_months && input.start_date) {
    const tempId = await nextLocalNumber("local_subscription_counter");
    const subscriptionOperation: OfflineOperation = {
      ...buildOperationBase(),
      kind: "subscription_create",
      payload: {
        tempId,
        memberId,
        memberName: input.name,
        startDate: input.start_date,
        planMonths: input.plan_months,
        pricePaid: input.price_paid ?? null,
        paymentMethod: input.payment_method ?? null,
        sessionsPerMonth: input.sessions_per_month ?? null,
        expectedActiveSubscriptionId: null,
      },
    };
    await enqueueOperation(subscriptionOperation);
  }

  return { memberId, offline: true, role: profile?.role || null };
}

export async function queueMemberUpdate(input: {
  memberId: string;
  patch: MemberUpdatePayload["patch"];
  baseUpdatedAt: number | null;
  photoDataUrl?: string | null;
}) {
  const operation: OfflineOperation = {
    ...buildOperationBase(),
    kind: "member_update",
    payload: {
      memberId: input.memberId,
      patch: input.patch,
      baseUpdatedAt: input.baseUpdatedAt,
      photoDataUrl: input.photoDataUrl || null,
    },
  };
  await enqueueOperation(operation);
  return { operationId: operation.operationId, offline: true };
}

export async function queueSubscriptionCreate(input: {
  memberId: string;
  memberName: string | null;
  startDate: number;
  planMonths: number;
  pricePaid: number | null;
  paymentMethod: "cash" | "digital" | null;
  sessionsPerMonth: number | null;
  expectedActiveSubscriptionId: number | null;
}) {
  const tempId = await nextLocalNumber("local_subscription_counter");
  const operation: OfflineOperation = {
    ...buildOperationBase(),
    kind: "subscription_create",
    payload: {
      tempId,
      memberId: input.memberId,
      memberName: input.memberName,
      startDate: input.startDate,
      planMonths: input.planMonths,
      pricePaid: input.pricePaid,
      paymentMethod: input.paymentMethod,
      sessionsPerMonth: input.sessionsPerMonth,
      expectedActiveSubscriptionId: input.expectedActiveSubscriptionId,
    },
  };
  await enqueueOperation(operation);
  return { operationId: operation.operationId, tempId, offline: true };
}

export async function queueSubscriptionRenew(input: {
  memberId: string;
  memberName: string | null;
  previousSubscriptionId: number;
  expectedPreviousEndDate: number;
  expectedPreviousIsActive: boolean;
  planMonths: number;
  pricePaid: number | null;
  paymentMethod: "cash" | "digital" | null;
  sessionsPerMonth: number | null;
}) {
  const tempId = await nextLocalNumber("local_subscription_counter");
  const operation: OfflineOperation = {
    ...buildOperationBase(),
    kind: "subscription_renew",
    payload: {
      tempId,
      memberId: input.memberId,
      memberName: input.memberName,
      previousSubscriptionId: input.previousSubscriptionId,
      expectedPreviousEndDate: input.expectedPreviousEndDate,
      expectedPreviousIsActive: input.expectedPreviousIsActive,
      planMonths: input.planMonths,
      pricePaid: input.pricePaid,
      paymentMethod: input.paymentMethod,
      sessionsPerMonth: input.sessionsPerMonth,
    },
  };
  await enqueueOperation(operation);
  return { operationId: operation.operationId, tempId, offline: true };
}

export async function queueSubscriptionFreeze(input: {
  subscriptionId: number;
  startDate: number;
  days: number;
  expectedSubscriptionEndDate: number;
}) {
  const tempId = await nextLocalNumber("local_freeze_counter");
  const operation: OfflineOperation = {
    ...buildOperationBase(),
    kind: "subscription_freeze",
    payload: {
      tempId,
      subscriptionId: input.subscriptionId,
      startDate: input.startDate,
      days: input.days,
      expectedSubscriptionEndDate: input.expectedSubscriptionEndDate,
    },
  };
  await enqueueOperation(operation);
  return { operationId: operation.operationId, tempId, offline: true };
}

export async function markOperationSyncing(operationId: string) {
  const current = await getOperation(operationId);
  if (!current) return;
  const next: OfflineOperation = {
    ...current,
    status: "syncing",
    updatedAt: nowUnix(),
  };
  await putOperation(next);
}

export async function markOperationFailed(operationId: string, error: string) {
  const current = await getOperation(operationId);
  if (!current) return;
  const next: OfflineOperation = {
    ...current,
    status: "failed",
    retries: current.retries + 1,
    lastError: error,
    updatedAt: nowUnix(),
  };
  await putOperation(next);
  await applyOperationToLocalState(next);
}

export async function markOperationPending(operationId: string) {
  const current = await getOperation(operationId);
  if (!current) return;
  const next: OfflineOperation = {
    ...current,
    status: "pending",
    updatedAt: nowUnix(),
  };
  await putOperation(next);
  await applyOperationToLocalState(next);
}

export async function markOperationSynced(operationId: string) {
  const current = await getOperation(operationId);
  if (!current) return;

  const next: OfflineOperation = {
    ...current,
    status: "synced",
    updatedAt: nowUnix(),
  };
  await putOperation(next);

  if (current.kind === "subscription_freeze") {
    await deleteFreeze(current.payload.tempId);
  }
}

export async function getPendingOperations() {
  const operations = await getAllOperations();
  return operations
    .filter((item) => item.status === "pending")
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function getFailedOperations() {
  const operations = await getAllOperations();
  return operations
    .filter((item) => item.status === "failed")
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getOperationCounts() {
  const operations = await getAllOperations();
  return operations.reduce(
    (acc, item) => {
      if (item.status === "pending") acc.pending += 1;
      if (item.status === "syncing") acc.syncing += 1;
      if (item.status === "failed") acc.failed += 1;
      return acc;
    },
    { pending: 0, syncing: 0, failed: 0 },
  );
}

export async function retryAllFailedOperations() {
  const failed = await getFailedOperations();
  for (const item of failed) {
    await markOperationPending(item.operationId);
  }
}

export async function getStaleWarningState() {
  const ageSeconds = await getOfflineAgeSeconds();
  return {
    ageSeconds,
    stale: Number.isFinite(ageSeconds) && ageSeconds > 0,
  };
}
