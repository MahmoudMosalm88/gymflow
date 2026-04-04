import {
  getOfflineDb,
  type OfflineAttendanceLog,
  type OfflineFreeze,
  type OfflineMember,
  type OfflineOperation,
  type OfflinePayment,
  type OfflineSettings,
  type OfflineSubscription,
} from "./db";

export function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

export function toUnixSeconds(input: unknown, fallback = 0): number {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input > 1_000_000_000_000 ? Math.floor(input / 1000) : Math.floor(input);
  }
  if (typeof input === "string") {
    const asNumber = Number(input);
    if (Number.isFinite(asNumber)) {
      return asNumber > 1_000_000_000_000 ? Math.floor(asNumber / 1000) : Math.floor(asNumber);
    }
    const parsed = Date.parse(input);
    if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000);
  }
  if (input instanceof Date) return Math.floor(input.getTime() / 1000);
  return fallback;
}

export function toIsoString(input: unknown) {
  const unix = toUnixSeconds(input);
  if (!unix) return new Date(0).toISOString();
  return new Date(unix * 1000).toISOString();
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export async function getAllMembers() {
  const db = await getOfflineDb();
  return (await db.getAll("members")) as OfflineMember[];
}

export async function getMember(id: string) {
  const db = await getOfflineDb();
  return (await db.get("members", id)) as OfflineMember | undefined;
}

export async function putMember(member: OfflineMember) {
  const db = await getOfflineDb();
  await db.put("members", member);
}

export async function deleteMember(id: string) {
  const db = await getOfflineDb();
  await db.delete("members", id);
}

export async function getAllSubscriptions() {
  const db = await getOfflineDb();
  return (await db.getAll("subscriptions")) as OfflineSubscription[];
}

export async function getSubscription(id: number) {
  const db = await getOfflineDb();
  return (await db.get("subscriptions", id)) as OfflineSubscription | undefined;
}

export async function putSubscription(subscription: OfflineSubscription) {
  const db = await getOfflineDb();
  await db.put("subscriptions", subscription);
}

export async function deleteSubscription(id: number) {
  const db = await getOfflineDb();
  await db.delete("subscriptions", id);
}

export async function getAllFreezes() {
  const db = await getOfflineDb();
  return (await db.getAll("subscription_freezes")) as OfflineFreeze[];
}

export async function putFreeze(freeze: OfflineFreeze) {
  const db = await getOfflineDb();
  await db.put("subscription_freezes", freeze);
}

export async function deleteFreeze(id: number) {
  const db = await getOfflineDb();
  await db.delete("subscription_freezes", id);
}

export async function getAllPayments() {
  const db = await getOfflineDb();
  return (await db.getAll("payments")) as OfflinePayment[];
}

export async function putPayment(payment: OfflinePayment) {
  const db = await getOfflineDb();
  await db.put("payments", payment);
}

export async function deletePayment(id: number) {
  const db = await getOfflineDb();
  await db.delete("payments", id);
}

export async function getAllAttendanceLogs() {
  const db = await getOfflineDb();
  return (await db.getAll("attendance_logs")) as OfflineAttendanceLog[];
}

export async function putAttendanceLog(log: OfflineAttendanceLog) {
  const db = await getOfflineDb();
  await db.put("attendance_logs", log);
}

export async function getAttendanceLog(id: string) {
  const db = await getOfflineDb();
  return (await db.get("attendance_logs", id)) as OfflineAttendanceLog | undefined;
}

export async function getAllOperations() {
  const db = await getOfflineDb();
  return (await db.getAll("operations")) as OfflineOperation[];
}

export async function getOperation(operationId: string) {
  const db = await getOfflineDb();
  return (await db.get("operations", operationId)) as OfflineOperation | undefined;
}

export async function putOperation(operation: OfflineOperation) {
  const db = await getOfflineDb();
  await db.put("operations", operation);
}

export async function deleteOperation(operationId: string) {
  const db = await getOfflineDb();
  await db.delete("operations", operationId);
}

export async function getSettingsMap() {
  const db = await getOfflineDb();
  const rows = (await db.getAll("settings")) as OfflineSettings[];
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function getSyncMeta<T = unknown>(key: string) {
  const db = await getOfflineDb();
  const row = await db.get("sync_meta", key);
  return (row?.value as T | undefined) ?? undefined;
}

export async function setSyncMeta(key: string, value: unknown) {
  const db = await getOfflineDb();
  await db.put("sync_meta", { key, value });
}

export async function nextLocalNumber(counterKey: string) {
  const current = (await getSyncMeta<number>(counterKey)) ?? -1;
  const next = current - 1;
  await setSyncMeta(counterKey, next);
  return current;
}

export async function replaceStore<T>(storeName: string, rows: T[]) {
  const db = await getOfflineDb();
  const tx = db.transaction(storeName, "readwrite");
  await tx.store.clear();
  for (const row of rows) {
    await tx.store.put(row as never);
  }
  await tx.done;
}

export async function getOfflineAgeSeconds() {
  const lastSync = (await getSyncMeta<number>("last_bundle_sync")) ?? 0;
  if (!lastSync) return Number.POSITIVE_INFINITY;
  return nowUnix() - lastSync;
}
