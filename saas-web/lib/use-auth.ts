"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FirebaseClientConfig,
  getFirebaseClientAuth,
  isFirebaseClientConfig
} from "@/lib/firebase-client";

export type OwnerProfile = {
  id: string;
  name: string;
  email?: string;
  organizationName?: string;
  branchName?: string;
};

type AuthState = {
  loading: boolean;
  token: string | null;
  branchId: string | null;
  profile: OwnerProfile | null;
};

const SESSION_TOKEN_KEY = "session_token";
const BRANCH_ID_KEY = "branch_id";
const OWNER_PROFILE_KEY = "owner_profile";

function unwrapData(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (record.data && typeof record.data === "object") return record.data as Record<string, unknown>;
  return record;
}

function readProfileFromStorage() {
  const profileJson = localStorage.getItem(OWNER_PROFILE_KEY);
  if (!profileJson) return null;
  try {
    return JSON.parse(profileJson) as OwnerProfile;
  } catch {
    return null;
  }
}

async function recoverSessionFromFirebase(): Promise<boolean> {
  try {
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

    const loginResponse = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
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
    const owner = data?.owner && typeof data.owner === "object"
      ? (data.owner as Record<string, unknown>)
      : null;

    if (typeof session?.idToken === "string" && session.idToken.length > 20) {
      localStorage.setItem(SESSION_TOKEN_KEY, session.idToken);
    }
    if (typeof session?.branchId === "string" && session.branchId) {
      localStorage.setItem(BRANCH_ID_KEY, session.branchId);
    }
    if (owner) {
      localStorage.setItem(OWNER_PROFILE_KEY, JSON.stringify(owner));
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
      let branchId = localStorage.getItem(BRANCH_ID_KEY);
      let profile = readProfileFromStorage();

      if (!token) {
        const recovered = await recoverSessionFromFirebase();
        if (!recovered) {
          if (!cancelled) {
            setState({ loading: false, token: null, branchId: null, profile: null });
            router.replace("/login");
          }
          return;
        }
        token = localStorage.getItem(SESSION_TOKEN_KEY);
        branchId = localStorage.getItem(BRANCH_ID_KEY);
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
  localStorage.removeItem(OWNER_PROFILE_KEY);
  window.location.href = "/login";
}
