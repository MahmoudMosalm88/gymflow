import { NextRequest } from "next/server";
import { requireRoles } from "@/lib/auth";
import { query } from "@/lib/db";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TrainerStat = {
  trainer_id: string;
  active_clients: number;
  sessions_this_month: number;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner", "manager", "staff"]);

    const rows = await query<TrainerStat>(
      `SELECT su.id AS trainer_id,
              COUNT(DISTINCT mta.member_id)::int AS active_clients,
              COUNT(DISTINCT ps.id) FILTER (
                WHERE ps.status IN ('completed', 'no_show', 'late_cancel')
                  AND ps.scheduled_start >= date_trunc('month', NOW())
              )::int AS sessions_this_month
         FROM staff_users su
         LEFT JOIN member_trainer_assignments mta
           ON mta.trainer_staff_user_id = su.id
          AND mta.organization_id = su.organization_id
          AND mta.branch_id = su.branch_id
          AND mta.is_active = true
         LEFT JOIN pt_sessions ps
           ON ps.trainer_staff_user_id = su.id
          AND ps.organization_id = su.organization_id
          AND ps.branch_id = su.branch_id
        WHERE su.organization_id = $1
          AND su.branch_id = $2
          AND su.role = 'trainer'
        GROUP BY su.id`,
      [auth.organizationId, auth.branchId]
    );

    return ok(rows);
  } catch (error) {
    return routeError(error);
  }
}
