/**
 * Fetch wrapper that attaches Bearer token and x-branch-id from localStorage.
 * It attempts to refresh Firebase ID tokens before forcing logout on 401.
 */

import { Auth } from "firebase/auth";
import {
  FirebaseClientConfig,
  getFirebaseClientAuth,
  isFirebaseClientConfig
} from "@/lib/firebase-client";

type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  message?: string;
};

const SESSION_TOKEN_KEY = "session_token";
const BRANCH_ID_KEY = "branch_id";
const OWNER_PROFILE_KEY = "owner_profile";

let firebaseAuthPromise: Promise<Auth | null> | null = null;
let rehydratePromise: Promise<boolean> | null = null;

function clearSessionAndRedirect() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(BRANCH_ID_KEY);
  localStorage.removeItem(OWNER_PROFILE_KEY);
  window.location.href = "/login";
}

function unwrapData(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  return record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : record;
}

async function getFirebaseAuthForSession() {
  if (firebaseAuthPromise) return firebaseAuthPromise;

  firebaseAuthPromise = (async () => {
    try {
      const response = await fetch("/api/auth/firebase-config", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) return null;
      const candidate = unwrapData(payload);
      if (!isFirebaseClientConfig(candidate)) return null;
      return await getFirebaseClientAuth(candidate as FirebaseClientConfig);
    } catch {
      return null;
    }
  })();

  try {
    return await firebaseAuthPromise;
  } catch {
    firebaseAuthPromise = null;
    return null;
  }
}

async function resolveBearerToken(forceRefresh = false) {
  let token = localStorage.getItem(SESSION_TOKEN_KEY);
  try {
    const auth = await getFirebaseAuthForSession();
    const currentUser = auth?.currentUser;
    if (currentUser) {
      const fresh = await currentUser.getIdToken(forceRefresh);
      if (fresh) {
        token = fresh;
        localStorage.setItem(SESSION_TOKEN_KEY, fresh);
      }
    }
  } catch {
    // Keep localStorage token fallback.
  }
  return token;
}

function persistSessionFromLoginPayload(payload: unknown): boolean {
  const data = unwrapData(payload);
  if (!data) return false;

  const session = typeof data.session === "object" && data.session
    ? (data.session as Record<string, unknown>)
    : null;
  const owner = typeof data.owner === "object" && data.owner
    ? (data.owner as Record<string, unknown>)
    : null;

  const token = typeof session?.idToken === "string" ? session.idToken : null;
  const branchId = typeof session?.branchId === "string" ? session.branchId : null;

  if (!token || token.length < 20) return false;
  localStorage.setItem(SESSION_TOKEN_KEY, token);
  if (branchId) {
    localStorage.setItem(BRANCH_ID_KEY, branchId);
  }
  if (owner) {
    localStorage.setItem(OWNER_PROFILE_KEY, JSON.stringify(owner));
  }
  return true;
}

async function rehydrateSessionFromFirebase(): Promise<boolean> {
  if (rehydratePromise) return rehydratePromise;

  rehydratePromise = (async () => {
    try {
      const auth = await getFirebaseAuthForSession();
      const user = auth?.currentUser;
      if (!user) return false;

      const idToken = await user.getIdToken(true);
      if (!idToken) return false;
      localStorage.setItem(SESSION_TOKEN_KEY, idToken);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) return false;

      if (persistSessionFromLoginPayload(payload)) return true;
      return Boolean(localStorage.getItem(SESSION_TOKEN_KEY));
    } catch {
      return false;
    } finally {
      rehydratePromise = null;
    }
  })();

  return rehydratePromise;
}

function buildHeaders(
  options: RequestInit,
  token: string | null,
  branchId: string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>)
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (branchId) headers["x-branch-id"] = branchId;
  return headers;
}

async function request<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  let branchId = localStorage.getItem(BRANCH_ID_KEY);
  let token = await resolveBearerToken(false);
  let headers = buildHeaders(options, token, branchId);
  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // Retry once with a forced Firebase token refresh before logging out.
    token = await resolveBearerToken(true);
    headers = buildHeaders(options, token, branchId);
    res = await fetch(url, { ...options, headers });
  }

  if (res.status === 401) {
    const rehydrated = await rehydrateSessionFromFirebase();
    if (rehydrated) {
      branchId = localStorage.getItem(BRANCH_ID_KEY);
      token = await resolveBearerToken(true);
      headers = buildHeaders(options, token, branchId);
      res = await fetch(url, { ...options, headers });
    }
  }

  if (res.status === 401) {
    clearSessionAndRedirect();
    throw new Error("Unauthorized");
  }

  return res.json() as Promise<ApiResponse<T>>;
}

export const api = {
  get: <T = unknown>(url: string) => request<T>(url),

  post: <T = unknown>(url: string, body: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) }),

  patch: <T = unknown>(url: string, body: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),

  put: <T = unknown>(url: string, body: unknown) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(body) }),

  delete: <T = unknown>(url: string, body?: unknown) =>
    request<T>(url, { method: "DELETE", body: body ? JSON.stringify(body) : undefined })
};
