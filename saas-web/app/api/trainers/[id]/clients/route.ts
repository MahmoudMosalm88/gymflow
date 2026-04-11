import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { query } from "@/lib/db";
import { ok, fail, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    const { id: trainerId } = await context.params;

    // Trainers can only see their own clients
    if (auth.role === "trainer" && auth.staffUserId !== trainerId) {
      return fail("Access denied.", 403);
    }

    const rows = await query(
      `SELECT m.id, m.name, m.phone, m.photo_path,
              mta.assigned_at::text,
              (SELECT COUNT(*)::int FROM pt_packages p
               WHERE p.member_id = m.id AND p.assigned_trainer_staff_user_id = $3
               AND p.organization_id = $1 AND p.branch_id = $2 AND p.status = 'active') AS active_packages,
              (SELECT GREATEST(SUM(GREATEST(p2.total_sessions - p2.sessions_used, 0)), 0)::int
               FROM pt_packages p2
               WHERE p2.member_id = m.id AND p2.assigned_trainer_staff_user_id = $3
               AND p2.organization_id = $1 AND p2.branch_id = $2 AND p2.status = 'active') AS sessions_remaining
         FROM member_trainer_assignments mta
         JOIN members m ON m.id = mta.member_id AND m.deleted_at IS NULL
        WHERE mta.organization_id = $1
          AND mta.branch_id = $2
          AND mta.trainer_staff_user_id = $3
          AND mta.is_active = true
        ORDER BY m.name ASC`,
      [auth.organizationId, auth.branchId, trainerId]
    );
    return ok(rows);
  } catch (error) {
    return routeError(error);
  }
}
