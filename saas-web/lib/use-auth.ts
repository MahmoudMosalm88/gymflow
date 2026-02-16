"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
    const token = localStorage.getItem("session_token");
    const branchId = localStorage.getItem("branch_id");
    const profileJson = localStorage.getItem("owner_profile");

    if (!token) {
      router.replace("/login");
      return;
    }

    let profile: OwnerProfile | null = null;
    try {
      profile = profileJson ? JSON.parse(profileJson) : null;
    } catch {
      // ignore parse errors
    }

    setState({ loading: false, token, branchId, profile });
  }, [router]);

  return state;
}

/** Clear auth data and redirect to login */
export function logout() {
  localStorage.removeItem("session_token");
  localStorage.removeItem("branch_id");
  localStorage.removeItem("owner_profile");
  window.location.href = "/login";
}
