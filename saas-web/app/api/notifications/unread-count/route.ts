import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM notification_recipients r
         JOIN notifications n ON n.id = r.notification_id
        WHERE r.organization_id = $1
          AND (r.branch_id = $2 OR r.branch_id IS NULL)
          AND r.read_at IS NULL
          AND (n.expires_at IS NULL OR n.expires_at > NOW())`,
      [auth.organizationId, auth.branchId]
    );

    return ok({ unread: Number(rows[0]?.count || 0) });
  } catch (error) {
    return routeError(error);
  }
}
