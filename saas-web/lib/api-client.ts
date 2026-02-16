/**
 * Fetch wrapper that attaches Bearer token and x-branch-id from localStorage.
 * Redirects to /login on 401.
 */

type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  message?: string;
};

async function request<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem("session_token");
  const branchId = localStorage.getItem("branch_id");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>)
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (branchId) headers["x-branch-id"] = branchId;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("session_token");
    localStorage.removeItem("branch_id");
    localStorage.removeItem("owner_profile");
    window.location.href = "/login";
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
