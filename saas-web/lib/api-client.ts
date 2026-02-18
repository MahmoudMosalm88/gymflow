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

let firebaseAuthPromise: Promise<Auth | null> | null = null;

function clearSessionAndRedirect() {
  localStorage.removeItem("session_token");
  localStorage.removeItem("branch_id");
  localStorage.removeItem("owner_profile");
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
  let token = localStorage.getItem("session_token");
  try {
    const auth = await getFirebaseAuthForSession();
    const currentUser = auth?.currentUser;
    if (currentUser) {
      const fresh = await currentUser.getIdToken(forceRefresh);
      if (fresh) {
        token = fresh;
        localStorage.setItem("session_token", fresh);
      }
    }
  } catch {
    // Keep localStorage token fallback.
  }
  return token;
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
  const branchId = localStorage.getItem("branch_id");
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

