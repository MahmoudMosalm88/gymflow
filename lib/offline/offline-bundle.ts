import { api } from "@/lib/api-client";
import { getOfflineDb, type OfflineAttendanceLog, type OfflineFreeze, type OfflineMember, type OfflinePayment, type OfflineSettings, type OfflineSubscription } from "./db";
import { replayPendingOfflineState } from "./operations";

type BundleResponse = {
  members: OfflineMember[];
  subscriptions: OfflineSubscription[];
  freezes: OfflineFreeze[];
  payments: OfflinePayment[];
  attendanceLogs: OfflineAttendanceLog[];
  settings: OfflineSettings[];
  serverNow: number;
};

export async function fetchAndStoreBundle(): Promise<boolean> {
  try {
    const res = await api.get<BundleResponse>("/api/members/offline-bundle");
    if (!res.data) return false;

    const { members, subscriptions, freezes, payments, attendanceLogs, settings, serverNow } = res.data;
    const db = await getOfflineDb();
    const tx = db.transaction(
      [
        "members",
        "subscriptions",
        "subscription_freezes",
        "payments",
        "attendance_logs",
        "settings",
        "sync_meta"
      ],
      "readwrite"
    );

    await Promise.all([
      tx.objectStore("members").clear(),
      tx.objectStore("subscriptions").clear(),
      tx.objectStore("subscription_freezes").clear(),
      tx.objectStore("payments").clear(),
      tx.objectStore("attendance_logs").clear(),
      tx.objectStore("settings").clear()
    ]);

    for (const member of members) {
      await tx.objectStore("members").put(member);
    }
    for (const subscription of subscriptions) {
      await tx.objectStore("subscriptions").put(subscription);
    }
    for (const freeze of freezes) {
      await tx.objectStore("subscription_freezes").put(freeze);
    }
    for (const payment of payments) {
      await tx.objectStore("payments").put(payment);
    }
    for (const log of attendanceLogs) {
      await tx.objectStore("attendance_logs").put(log);
    }
    for (const setting of settings) {
      await tx.objectStore("settings").put(setting);
    }

    const clientNow = Math.floor(Date.now() / 1000);
    await tx.objectStore("sync_meta").put({ key: "server_time_offset", value: serverNow - clientNow });
    await tx.objectStore("sync_meta").put({ key: "last_bundle_sync", value: clientNow });
    await tx.done;

    await replayPendingOfflineState();
    return true;
  } catch {
    return false;
  }
}

export async function getServerTimeOffset(): Promise<number> {
  try {
    const db = await getOfflineDb();
    const meta = await db.get("sync_meta", "server_time_offset");
    return typeof meta?.value === "number" ? meta.value : 0;
  } catch {
    return 0;
  }
}
