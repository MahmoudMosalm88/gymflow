import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    const id = String(params.id || "").trim();
    if (!id) return fail("Notification id is required", 400);

    const rows = await query<{ notification_id: string }>(
      `UPDATE notification_recipients r
          SET read_at = COALESCE(r.read_at, NOW())
         FROM notifications n
        WHERE n.id = r.notification_id
          AND r.notification_id = $1
          AND r.organization_id = $2
          AND (r.branch_id = $3 OR r.branch_id IS NULL)
          AND (n.expires_at IS NULL OR n.expires_at > NOW())
      RETURNING r.notification_id`,
      [id, auth.organizationId, auth.branchId]
    );

    if (!rows[0]) return fail("Notification not found", 404);
    return ok({ id: rows[0].notification_id, read: true });
  } catch (error) {
    return routeError(error);
  }
}
