import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/attendance/today
// Returns today's last 50 check-in logs (all results) for the activity feed
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const now = Math.floor(Date.now() / 1000);
    const startOfDay = now - (now % 86400);

    const rows = await query<{
      id: string;
      timestamp: number;
      result: string;
      reason_code: string | null;
      scanned_value: string;
      member_name: string | null;
    }>(
      `SELECT l.id, l.timestamp,
              CASE WHEN l.status = 'success' THEN 'allowed' ELSE 'denied' END AS result,
              l.reason_code, l.scanned_value,
              m.name AS member_name
         FROM logs l
         LEFT JOIN members m ON l.member_id = m.id
        WHERE l.organization_id = $1
          AND l.branch_id = $2
          AND l.timestamp >= $3
          AND l.timestamp < $4
        ORDER BY l.timestamp DESC
        LIMIT 50`,
      [auth.organizationId, auth.branchId, startOfDay, startOfDay + 86400]
    );

    return ok(rows);
  } catch (error) {
    return routeError(error);
  }
}
