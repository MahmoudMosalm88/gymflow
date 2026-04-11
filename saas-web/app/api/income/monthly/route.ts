import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { ensurePaymentsTable, incomeEventsCte } from "@/lib/income-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MonthRow = {
  month: string;
  revenue: string;
  count: string;
  subscription_revenue: string;
  guest_revenue: string;
  pt_revenue: string;
};

export async function GET(request: NextRequest) {
  try {
    const { organizationId, branchId } = await requireAuth(request);
    await ensurePaymentsTable();
    const rows = await query<MonthRow>(
      `${incomeEventsCte}
       SELECT
         to_char(effective_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
         COALESCE(SUM(amount), 0)::text AS revenue,
         COUNT(*)::text AS count,
         COALESCE(SUM(CASE WHEN payment_type IN ('subscription', 'renewal') THEN amount ELSE 0 END), 0)::text AS subscription_revenue,
         COALESCE(SUM(CASE WHEN payment_type = 'guest_pass' THEN amount ELSE 0 END), 0)::text AS guest_revenue,
         COALESCE(SUM(CASE WHEN payment_type = 'pt_package' THEN amount ELSE 0 END), 0)::text AS pt_revenue
       FROM income_events
       GROUP BY month
       ORDER BY month DESC`,
      [organizationId, branchId]
    );

    const data = rows.map((row) => ({
      month: row.month,
      revenue: Number(row.revenue),
      subscriptionRevenue: Number(row.subscription_revenue),
      guestRevenue: Number(row.guest_revenue),
      ptRevenue: Number(row.pt_revenue),
      count: Number(row.count),
    }));

    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}
