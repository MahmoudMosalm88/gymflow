import { query } from "@/lib/db";

type TrainerPerformance = {
  trainer_id: string;
  trainer_name: string;
  sessions_completed: number;
  sessions_no_show: number;
  sessions_total: number;
  no_show_rate: number;
  revenue: number;
  active_clients: number;
  active_packages: number;
};

type PerformanceResult = {
  summary: {
    totalSessions: number;
    totalCompleted: number;
    totalNoShow: number;
    totalRevenue: number;
    overallNoShowRate: number;
  };
  trainers: TrainerPerformance[];
};

export async function getTrainerPerformanceStats(
  organizationId: string,
  branchId: string,
  fromUnix: number,
  toUnix: number
): Promise<PerformanceResult> {
  const rows = await query<{
    trainer_id: string;
    trainer_name: string;
    sessions_completed: string;
    sessions_no_show: string;
    sessions_total: string;
    revenue: string;
    active_clients: string;
    active_packages: string;
  }>(
    `SELECT
        su.id AS trainer_id,
        su.name AS trainer_name,
        COUNT(*) FILTER (WHERE ps.status = 'completed')::text AS sessions_completed,
        COUNT(*) FILTER (WHERE ps.status = 'no_show')::text AS sessions_no_show,
        COUNT(*) FILTER (WHERE ps.status IN ('completed', 'no_show', 'late_cancel'))::text AS sessions_total,
        COALESCE((
          SELECT SUM(pp.price_paid)::text
            FROM pt_packages pp
           WHERE pp.assigned_trainer_staff_user_id = su.id
             AND pp.organization_id = $1 AND pp.branch_id = $2
             AND EXTRACT(EPOCH FROM pp.created_at)::bigint >= $3
             AND EXTRACT(EPOCH FROM pp.created_at)::bigint < $4
        ), '0') AS revenue,
        (SELECT COUNT(DISTINCT mta.member_id)::text
           FROM member_trainer_assignments mta
          WHERE mta.trainer_staff_user_id = su.id AND mta.organization_id = $1 AND mta.branch_id = $2 AND mta.is_active = true
        ) AS active_clients,
        (SELECT COUNT(*)::text
           FROM pt_packages pp2
          WHERE pp2.assigned_trainer_staff_user_id = su.id AND pp2.organization_id = $1 AND pp2.branch_id = $2 AND pp2.status = 'active'
        ) AS active_packages
      FROM staff_users su
      LEFT JOIN pt_sessions ps
        ON ps.trainer_staff_user_id = su.id
       AND ps.organization_id = su.organization_id
       AND ps.branch_id = su.branch_id
       AND EXTRACT(EPOCH FROM ps.scheduled_start)::bigint >= $3
       AND EXTRACT(EPOCH FROM ps.scheduled_start)::bigint < $4
     WHERE su.organization_id = $1
       AND su.branch_id = $2
       AND su.role = 'trainer'
       AND su.is_active = true
     GROUP BY su.id, su.name
     ORDER BY COUNT(*) FILTER (WHERE ps.status = 'completed') DESC`,
    [organizationId, branchId, fromUnix, toUnix]
  );

  const trainers: TrainerPerformance[] = rows.map(r => {
    const completed = Number(r.sessions_completed);
    const noShow = Number(r.sessions_no_show);
    const total = Number(r.sessions_total);
    return {
      trainer_id: r.trainer_id,
      trainer_name: r.trainer_name,
      sessions_completed: completed,
      sessions_no_show: noShow,
      sessions_total: total,
      no_show_rate: total > 0 ? Math.round((noShow / total) * 1000) / 10 : 0,
      revenue: Number(r.revenue),
      active_clients: Number(r.active_clients),
      active_packages: Number(r.active_packages),
    };
  });

  const totalCompleted = trainers.reduce((s, t) => s + t.sessions_completed, 0);
  const totalNoShow = trainers.reduce((s, t) => s + t.sessions_no_show, 0);
  const totalSessions = trainers.reduce((s, t) => s + t.sessions_total, 0);
  const totalRevenue = trainers.reduce((s, t) => s + t.revenue, 0);

  return {
    summary: {
      totalSessions,
      totalCompleted,
      totalNoShow,
      totalRevenue,
      overallNoShowRate: totalSessions > 0 ? Math.round((totalNoShow / totalSessions) * 1000) / 10 : 0,
    },
    trainers,
  };
}
