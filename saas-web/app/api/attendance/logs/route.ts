import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, fail, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const url = new URL(request.url);
    const memberId = url.searchParams.get("member_id");
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20)));

    if (!memberId) return fail("member_id is required", 400);

    const rows = await query<{ id: number; timestamp: number; method: string }>(
      `SELECT id, timestamp, method
         FROM logs
        WHERE organization_id = $1
          AND branch_id = $2
          AND member_id = $3
          AND status = 'success'
        ORDER BY timestamp DESC
        LIMIT $4`,
      [auth.organizationId, auth.branchId, memberId, limit]
    );

    return ok(rows);
  } catch (error) {
    return routeError(error);
  }
}
