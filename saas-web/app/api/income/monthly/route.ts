import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MonthRow = { month: string; revenue: string; count: string };
type GuestMonthRow = { month: string; revenue: string; count: string };

export async function GET(request: NextRequest) {
  try {
    const { organizationId, branchId } = await requireAuth(request);

    // Subscription revenue by month
    let subRows: MonthRow[] = [];
    try {
      subRows = await query<MonthRow>(
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
      subRows = await query<MonthRow>(
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

    // Guest pass revenue by month (using used_at as the date)
    const guestRows = await query<GuestMonthRow>(
      `SELECT
         to_char(used_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
         COALESCE(SUM(amount), 0) AS revenue,
         COUNT(*)::text AS count
       FROM guest_passes
       WHERE organization_id = $1 AND branch_id = $2
         AND used_at IS NOT NULL AND amount IS NOT NULL
       GROUP BY month`,
      [organizationId, branchId]
    );

    // Merge subscription and guest data by month
    const guestMap = new Map(guestRows.map((r) => [r.month, r]));
    const allMonths = new Set([...subRows.map((r) => r.month), ...guestRows.map((r) => r.month)]);

    const subMap = new Map(subRows.map((r) => [r.month, r]));
    const data = Array.from(allMonths)
      .sort((a, b) => b.localeCompare(a))
      .map((month) => {
        const sub = subMap.get(month);
        const guest = guestMap.get(month);
        const subRev = Number(sub?.revenue ?? 0);
        const guestRev = Number(guest?.revenue ?? 0);
        return {
          month,
          revenue: subRev + guestRev,
          subscriptionRevenue: subRev,
          guestRevenue: guestRev,
          count: Number(sub?.count ?? 0) + Number(guest?.count ?? 0),
        };
      });

    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}
