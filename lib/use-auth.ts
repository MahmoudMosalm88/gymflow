"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FirebaseClientConfig } from "@/lib/firebase-client";
import {
  BRANCH_ID_KEY,
  SESSION_PROFILE_KEY,
  SESSION_TOKEN_KEY,
  type SessionProfile,
} from "@/lib/session";

type AuthState = {
  loading: boolean;
  token: string | null;
  branchId: string | null;
  profile: SessionProfile | null;
};

async function loadFirebaseClientHelpers() {
  // Only load Firebase browser auth when we need to recover a missing local session.
  return await import("@/lib/firebase-client");
}

function unwrapData(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (record.data && typeof record.data === "object") return record.data as Record<string, unknown>;
  return record;
}

function readProfileFromStorage() {
  const profileJson = localStorage.getItem(SESSION_PROFILE_KEY);
  if (!profileJson) return null;
  try {
    return JSON.parse(profileJson) as SessionProfile;
  } catch {
    return null;
  }
}

function getStoredBranchId() {
  const branchId = localStorage.getItem(BRANCH_ID_KEY);
  if (branchId) return branchId;
  const profile = readProfileFromStorage();
  return typeof profile?.branchId === "string" ? profile.branchId : null;
}

async function clearOfflineState() {
  try {
    const [{ clearOfflineData }] = await Promise.all([
      import("@/lib/offline/db"),
    ]);
    await clearOfflineData();
  } catch {
    // Ignore IndexedDB cleanup failures.
  }

  if (typeof caches !== "undefined") {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith("gymflow-shell-")).map((key) => caches.delete(key)));
    } catch {
      // Ignore cache cleanup failures.
    }
  }
}

async function recoverSessionFromFirebase(): Promise<boolean> {
  try {
    const { getFirebaseClientAuth, isFirebaseClientConfig } = await loadFirebaseClientHelpers();
    const configResponse = await fetch("/api/auth/firebase-config", { cache: "no-store" });
    const configPayload = await configResponse.json().catch(() => null);
    if (!configResponse.ok) return false;

    const configData = unwrapData(configPayload);
    if (!isFirebaseClientConfig(configData)) return false;

    const auth = await getFirebaseClientAuth(configData as FirebaseClientConfig);
    const user = auth.currentUser;
    if (!user) return false;

    const idToken = await user.getIdToken(true);
    if (!idToken) return false;
    localStorage.setItem(SESSION_TOKEN_KEY, idToken);

    const branchId = getStoredBranchId();
    const loginResponse = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(branchId ? { "x-branch-id": branchId } : {})
      },
      body: JSON.stringify({ idToken })
    });
    const loginPayload = await loginResponse.json().catch(() => null);

    if (!loginResponse.ok) {
      return Boolean(localStorage.getItem(SESSION_TOKEN_KEY));
    }

    const data = unwrapData(loginPayload);
    const session = data?.session && typeof data.session === "object"
      ? (data.session as Record<string, unknown>)
      : null;
    const profile = data?.user && typeof data.user === "object"
      ? (data.user as Record<string, unknown>)
      : data?.owner && typeof data.owner === "object"
      ? (data.owner as Record<string, unknown>)
      : null;

    if (typeof session?.idToken === "string" && session.idToken.length > 20) {
      localStorage.setItem(SESSION_TOKEN_KEY, session.idToken);
    }
    if (typeof session?.branchId === "string" && session.branchId) {
      localStorage.setItem(BRANCH_ID_KEY, session.branchId);
    }
    if (profile) {
      localStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(profile));
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Auth hook — reads session data from localStorage.
 * Redirects to /login if no token is found.
 */
export function useAuth(): AuthState {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    loading: true,
    token: null,
    branchId: null,
    profile: null
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let token = localStorage.getItem(SESSION_TOKEN_KEY);
      let branchId = getStoredBranchId();
      let profile = readProfileFromStorage();

      if (!token) {
        if (!navigator.onLine && profile && branchId) {
          if (!cancelled) {
            setState({ loading: false, token: null, branchId, profile });
          }
          return;
        }

        const recovered = await recoverSessionFromFirebase();
        if (!recovered) {
          if (!cancelled) {
            setState({ loading: false, token: null, branchId: null, profile: null });
            router.replace("/login");
          }
          return;
        }
        token = localStorage.getItem(SESSION_TOKEN_KEY);
        branchId = getStoredBranchId();
        profile = readProfileFromStorage();
      }

      if (!cancelled) {
        setState({ loading: false, token, branchId, profile });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return state;
}

/** Clear auth data and redirect to login */
export function logout() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(BRANCH_ID_KEY);
  localStorage.removeItem(SESSION_PROFILE_KEY);
  void clearOfflineState().finally(() => {
    window.location.href = "/login";
  });
}
