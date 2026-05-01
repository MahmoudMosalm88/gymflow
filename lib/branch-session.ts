"use client";

import { BRANCH_ID_KEY, SESSION_PROFILE_KEY, type SessionProfile } from "@/lib/session";

export type BranchOption = {
  id: string;
  name: string;
  timezone?: string;
  currency?: string;
  created_at?: string;
  is_current?: boolean;
};

export function getStoredBranchId() {
  if (typeof window === "undefined") return null;
  const direct = window.localStorage.getItem(BRANCH_ID_KEY);
  if (direct) return direct;

  try {
    const raw = window.localStorage.getItem(SESSION_PROFILE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw) as SessionProfile;
    return typeof profile.branchId === "string" ? profile.branchId : null;
  } catch {
    return null;
  }
}

export function persistBranchLocally(branch: Pick<BranchOption, "id" | "name">) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BRANCH_ID_KEY, branch.id);

  const raw = window.localStorage.getItem(SESSION_PROFILE_KEY);
  if (!raw) return;

  try {
    const profile = JSON.parse(raw) as SessionProfile;
    window.localStorage.setItem(
      SESSION_PROFILE_KEY,
      JSON.stringify({
        ...profile,
        branchId: branch.id,
        branchName: branch.name
      })
    );
  } catch {
    // Keep branch_id even if an old profile payload is malformed.
  }
}

async function clearBranchScopedClientData() {
  await import("@/lib/offline/db")
    .then((mod) => mod.clearOfflineData())
    .catch(() => undefined);

  if (typeof caches === "undefined") return;
  await caches
    .keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith("gymflow-shell-")).map((key) => caches.delete(key))))
    .catch(() => undefined);
}

export async function switchBranch(branch: Pick<BranchOption, "id" | "name">, targetPath = "/dashboard") {
  persistBranchLocally(branch);
  await clearBranchScopedClientData();
  window.location.assign(targetPath);
}
