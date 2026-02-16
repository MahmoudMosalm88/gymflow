import { NextResponse } from "next/server";
import { ok } from "@/lib/http";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Test database connectivity with a simple query
    await query("SELECT 1");

    // Database is reachable
    return ok({ status: "ok", db: "connected" });
  } catch (error) {
    // Database connection failed
    console.error("Health check: database unreachable", error);
    return NextResponse.json(
      { status: "degraded", db: "unreachable" },
      { status: 503 }
    );
  }
}
