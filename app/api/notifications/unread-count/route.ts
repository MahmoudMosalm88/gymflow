import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import type { NotificationUnreadCountResponse } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const trainerStaffUserId =
      auth.role === "trainer" ? auth.staffUserId || "00000000-0000-0000-0000-000000000000" : null;
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM notification_recipients r
         JOIN notifications n ON n.id = r.notification_id
        WHERE r.organization_id = $1
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
          )`,
      [auth.organizationId, auth.branchId, trainerStaffUserId]
    );

    const response: NotificationUnreadCountResponse = { unread: Number(rows[0]?.count || 0) };
    return ok(response);
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: string }).code || "")
        : "";
    if (code === "42P01") {
      const response: NotificationUnreadCountResponse = { unread: 0 };
      return ok(response);
    }
    return routeError(error);
  }
}
