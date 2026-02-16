import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    const memberId = String(body.memberId || "");
    const type = String(body.type || "manual");
    const payload = body.payload || {};

    if (!memberId) return fail("memberId is required", 400);

    const rows = await query(
      `INSERT INTO message_queue (
          id, organization_id, branch_id, member_id, type,
          payload, status, attempts, scheduled_at
       ) VALUES (
          $1, $2, $3, $4, $5,
          $6::jsonb, 'pending', 0, NOW()
       )
       RETURNING id, status, scheduled_at`,
      [uuidv4(), auth.organizationId, auth.branchId, memberId, type, JSON.stringify(payload)]
    );

    return ok(rows[0], { status: 202 });
  } catch (error) {
    return routeError(error);
  }
}
