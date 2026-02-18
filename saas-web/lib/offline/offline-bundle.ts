/**
 * Fetches the offline bundle from the server and stores it in IndexedDB.
 * Called on dashboard load when online.
 */

import { api } from "@/lib/api-client";
import { getOfflineDb, type OfflineMember, type OfflineSettings } from "./db";

type BundleResponse = {
  members: OfflineMember[];
  settings: OfflineSettings[];
  serverNow: number;
};

export async function fetchAndStoreBundle(): Promise<boolean> {
  try {
    const res = await api.get<BundleResponse>("/api/members/offline-bundle");
    if (!res.data) return false;

    const { members, settings, serverNow } = res.data;
    const db = await getOfflineDb();

    // Store members
    const memberTx = db.transaction("members", "readwrite");
    await memberTx.store.clear();
    for (const m of members) {
      await memberTx.store.put(m);
    }
    await memberTx.done;

    // Store settings
    const settingsTx = db.transaction("settings", "readwrite");
    await settingsTx.store.clear();
    for (const s of settings) {
      await settingsTx.store.put(s);
    }
    await settingsTx.done;

    // Store sync metadata (server time offset)
    const clientNow = Math.floor(Date.now() / 1000);
    const metaTx = db.transaction("sync_meta", "readwrite");
    await metaTx.store.put({ key: "server_time_offset", value: serverNow - clientNow });
    await metaTx.store.put({ key: "last_bundle_sync", value: clientNow });
    await metaTx.done;

    return true;
  } catch {
    // Silently fail — offline bundle is best-effort
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
