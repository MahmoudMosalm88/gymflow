import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DayRow = { day: string; revenue: string; count: string };
type RevenueRow = { revenue: string };

function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ month: string }> }
) {
  try {
    const { organizationId, branchId } = await requireAuth(request);
    const { month } = await params;

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return ok({ days: [], prevMonthRevenue: 0 });
    }

    const [dayRows, prevRows] = await Promise.all([
      // Combine subscription + guest pass revenue per day
      query<DayRow>(
        `SELECT day, SUM(revenue)::text AS revenue, SUM(count)::text AS count FROM (
          (
            SELECT DATE(created_at AT TIME ZONE 'UTC')::text AS day,
                   COALESCE(SUM(price_paid), 0) AS revenue,
                   COUNT(*) AS count
            FROM subscriptions
            WHERE organization_id = $1 AND branch_id = $2
              AND price_paid IS NOT NULL
              AND to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') = $3
            GROUP BY day
          )
          UNION ALL
          (
            SELECT DATE(used_at AT TIME ZONE 'UTC')::text AS day,
                   COALESCE(SUM(amount), 0) AS revenue,
                   COUNT(*) AS count
            FROM guest_passes
            WHERE organization_id = $1 AND branch_id = $2
              AND used_at IS NOT NULL AND amount IS NOT NULL
              AND to_char(used_at AT TIME ZONE 'UTC', 'YYYY-MM') = $3
            GROUP BY day
          )
        ) combined
        GROUP BY day ORDER BY day`,
        [organizationId, branchId, month]
      ),
      // Previous month total (subscription + guest)
      query<RevenueRow>(
        `SELECT (
          COALESCE((SELECT SUM(price_paid) FROM subscriptions
            WHERE organization_id = $1 AND branch_id = $2 AND price_paid IS NOT NULL
              AND to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') = $3), 0)
          +
          COALESCE((SELECT SUM(amount) FROM guest_passes
            WHERE organization_id = $1 AND branch_id = $2
              AND used_at IS NOT NULL AND amount IS NOT NULL
              AND to_char(used_at AT TIME ZONE 'UTC', 'YYYY-MM') = $3), 0)
        )::text AS revenue`,
        [organizationId, branchId, prevMonth(month)]
      ),
    ]);

    const days = dayRows.map((r) => ({
      day: r.day,
      revenue: Number(r.revenue),
      count: Number(r.count),
    }));

    return ok({
      days,
      prevMonthRevenue: Number(prevRows[0]?.revenue ?? 0),
    });
  } catch (error) {
    return routeError(error);
  }
}
