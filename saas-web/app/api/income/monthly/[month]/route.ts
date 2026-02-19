import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DayRow = {
  day: string;
  revenue: string;
  count: string;
};

type RevenueRow = {
  revenue: string;
};

function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1); // m-1 is current month (0-indexed), m-2 is previous
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ month: string }> }
) {
  try {
    const { organizationId, branchId } = await requireAuth(request);
    const { month } = await params;

    // Validate format YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return ok({ days: [], prevMonthRevenue: 0 });
    }

    const [dayRows, prevRows] = await Promise.all([
      query<DayRow>(
        `SELECT DATE(created_at AT TIME ZONE 'UTC')::text AS day,
                COALESCE(SUM(price_paid), 0) AS revenue,
                COUNT(*)::text AS count
         FROM subscriptions
         WHERE organization_id = $1 AND branch_id = $2
           AND price_paid IS NOT NULL
           AND to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') = $3
         GROUP BY day ORDER BY day`,
        [organizationId, branchId, month]
      ),
      query<RevenueRow>(
        `SELECT COALESCE(SUM(price_paid), 0) AS revenue
         FROM subscriptions
         WHERE organization_id = $1 AND branch_id = $2
           AND price_paid IS NOT NULL
           AND to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') = $3`,
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
