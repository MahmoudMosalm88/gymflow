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

    if (auth.role === "trainer" && auth.staffUserId !== trainerId) {
      return fail("Access denied.", 403);
    }

    const url = new URL(request.url);
    const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") || 30)));
    const since = Math.floor(Date.now() / 1000) - days * 86400;

    const rows = await query<{
      sessions_completed: number;
      sessions_no_show: number;
      sessions_late_cancel: number;
      sessions_cancelled: number;
      sessions_scheduled: number;
      active_clients: number;
      active_packages: number;
      total_revenue: string;
    }>(
      `SELECT
        COUNT(*) FILTER (WHERE ps.status = 'completed')::int AS sessions_completed,
        COUNT(*) FILTER (WHERE ps.status = 'no_show')::int AS sessions_no_show,
        COUNT(*) FILTER (WHERE ps.status = 'late_cancel')::int AS sessions_late_cancel,
        COUNT(*) FILTER (WHERE ps.status = 'cancelled')::int AS sessions_cancelled,
        COUNT(*) FILTER (WHERE ps.status = 'scheduled')::int AS sessions_scheduled,
        (SELECT COUNT(DISTINCT mta.member_id)::int
           FROM member_trainer_assignments mta
          WHERE mta.trainer_staff_user_id = $3 AND mta.organization_id = $1 AND mta.branch_id = $2 AND mta.is_active = true
        ) AS active_clients,
        (SELECT COUNT(*)::int
           FROM pt_packages pp
          WHERE pp.assigned_trainer_staff_user_id = $3 AND pp.organization_id = $1 AND pp.branch_id = $2 AND pp.status = 'active'
        ) AS active_packages,
        (SELECT COALESCE(SUM(pp2.price_paid), 0)::text
           FROM pt_packages pp2
          WHERE pp2.assigned_trainer_staff_user_id = $3 AND pp2.organization_id = $1 AND pp2.branch_id = $2
            AND EXTRACT(EPOCH FROM pp2.created_at)::bigint >= $4
        ) AS total_revenue
       FROM pt_sessions ps
      WHERE ps.trainer_staff_user_id = $3
        AND ps.organization_id = $1
        AND ps.branch_id = $2
        AND EXTRACT(EPOCH FROM ps.scheduled_start)::bigint >= $4`,
      [auth.organizationId, auth.branchId, trainerId, since]
    );
    return ok(rows[0] ?? {});
  } catch (error) {
    return routeError(error);
  }
}
