import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      message,
      details: details || undefined
    },
    { status }
  );
}

export function routeError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: string }).code || "")
      : "";
  console.error("Route error:", msg, error instanceof Error ? error.stack : "");

  // Return helpful messages for common errors instead of hiding everything
  if (msg.includes("ECONNREFUSED") || code === "ECONNREFUSED") {
    return fail("Database connection failed. The database proxy may not be running.", 503);
  }
  if (msg.includes("id-token-expired")) {
    return fail("Your session has expired. Please log out and log back in.", 401);
  }
  if (msg.includes("auth/id-token-expired")) {
    return fail("Your session has expired. Please log out and log back in.", 401);
  }
  if (msg.includes("Firebase admin credentials are not configured")) {
    return fail("Authentication service is not configured correctly.", 500);
  }
  if (msg.includes("Missing bearer token")) {
    return fail("You are not logged in. Please log in first.", 401);
  }
  if (
    msg.includes("Firebase ID token has incorrect") ||
    msg.includes("incorrect \"aud\"") ||
    msg.includes("incorrect audience")
  ) {
    return fail("Firebase token belongs to a different project. Check Firebase web/admin config alignment.", 401);
  }
  if (msg.includes("Decoding Firebase ID token failed")) {
    return fail("Invalid Firebase token. Please sign in again.", 401);
  }
  if (msg.includes("auth/id-token-revoked")) {
    return fail("Your session was revoked. Please sign in again.", 401);
  }
  if (msg.includes("permission denied for relation") || code === "42501") {
    return fail("Database permission issue. Please run migrations/grants for the app DB user.", 500);
  }
  if (msg.includes("relation") && msg.includes("does not exist")) {
    return fail("Database schema is missing tables. Please run migrations.", 500);
  }
  if (code === "42P01") {
    return fail("Database schema is out of date. Please run migrations.", 500);
  }
  if (code === "23505") {
    return fail("A record with the same unique value already exists.", 409);
  }

  return fail("Something went wrong. Please try again.", 500);
}
