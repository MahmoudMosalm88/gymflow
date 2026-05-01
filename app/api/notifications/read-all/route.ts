import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const trainerStaffUserId =
      auth.role === "trainer" ? auth.staffUserId || "00000000-0000-0000-0000-000000000000" : null;
    const rows = await query<{ count: string }>(
      `WITH updated AS (
         UPDATE notification_recipients r
            SET read_at = NOW()
           FROM notifications n
          WHERE n.id = r.notification_id
            AND r.organization_id = $1
            AND (r.branch_id = $2 OR r.branch_id IS NULL)
            AND r.read_at IS NULL
            AND (n.expires_at IS NULL OR n.expires_at > NOW())
            AND (
              (
                $3::uuid IS NULL
                AND n.metadata->>'trainer_staff_user_id' IS NULL
                AND n.metadata->>'target_staff_user_id' IS NULL
              )
              OR (
                $3::uuid IS NOT NULL
                AND (
                  n.metadata->>'trainer_staff_user_id' = $3::text
                  OR n.metadata->>'target_staff_user_id' = $3::text
                )
              )
            )
        RETURNING 1
       )
       SELECT COUNT(*)::text AS count FROM updated`,
      [auth.organizationId, auth.branchId, trainerStaffUserId]
    );

    return ok({ updated: Number(rows[0]?.count || 0) });
  } catch (error) {
    return routeError(error);
  }
}
