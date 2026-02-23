import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MonthRow = {
  month: string;
  revenue: string;
  count: string;
};

export async function GET(request: NextRequest) {
  try {
    const { organizationId, branchId } = await requireAuth(request);

    let rows: MonthRow[] = [];
    try {
      rows = await query<MonthRow>(
        `SELECT
           to_char(COALESCE(updated_at, created_at) AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
           COALESCE(SUM(price_paid), 0) AS revenue,
           COUNT(*)::text AS count
         FROM subscriptions
         WHERE organization_id = $1 AND branch_id = $2 AND price_paid IS NOT NULL
         GROUP BY month
         ORDER BY month DESC`,
        [organizationId, branchId]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("updated_at")) throw error;
      rows = await query<MonthRow>(
        `SELECT
           to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
           COALESCE(SUM(price_paid), 0) AS revenue,
           COUNT(*)::text AS count
         FROM subscriptions
         WHERE organization_id = $1 AND branch_id = $2 AND price_paid IS NOT NULL
         GROUP BY month
         ORDER BY month DESC`,
        [organizationId, branchId]
      );
    }

    const data = rows.map((r) => ({
      month: r.month,
      revenue: Number(r.revenue),
      subscriptionRevenue: Number(r.revenue),
      guestRevenue: 0,
      count: Number(r.count),
    }));

    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}
