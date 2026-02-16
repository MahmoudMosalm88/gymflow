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
  // For user-facing API, return a generic message to avoid exposing internal details
  // Log the actual error for debugging
  if (error instanceof Error) {
    console.error("Route error:", error.message, error.stack);
  } else {
    console.error("Route error:", error);
  }
  return fail("We're having trouble processing your request. Please try again in a moment.", 500);
}
