import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { ensurePaymentsTable, incomeEventsCte } from "@/lib/income-events";
import { getCurrentSubscriptionAccessReferenceUnix } from "@/lib/subscription-dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { organizationId, branchId } = await requireAuth(request);
    const accessNow = getCurrentSubscriptionAccessReferenceUnix();
    await ensurePaymentsTable();

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastMonthEnd = thisMonthStart; // first day of this month = end of last month

    const [
      [totalRow],
      [expectedRow],
      [thisMonthRow],
      [lastMonthRow],
      [ptThisMonthRow],
      [activeSubsRow],
    ] = await Promise.all([
      // All-time total
      query<{ total: string }>(
        `${incomeEventsCte}
         SELECT COALESCE(SUM(amount), 0)::text AS total FROM income_events`,
        [organizationId, branchId]
      ),
      // Expected monthly from active subs
      query<{ total: string; count: string }>(
        `SELECT COALESCE(SUM(price_paid / NULLIF(plan_months, 0)), 0)::text AS total,
                COUNT(*)::text AS count
         FROM subscriptions
         WHERE organization_id = $1 AND branch_id = $2
           AND is_active = true
           AND start_date <= $3
           AND end_date > $3
           AND price_paid IS NOT NULL`,
        [organizationId, branchId, accessNow]
      ),
      // This month revenue
      query<{ total: string }>(
        `${incomeEventsCte}
         SELECT COALESCE(SUM(amount), 0)::text AS total
           FROM income_events
          WHERE effective_at >= $3::timestamptz`,
        [organizationId, branchId, thisMonthStart]
      ),
      // Last month revenue
      query<{ total: string }>(
        `${incomeEventsCte}
         SELECT COALESCE(SUM(amount), 0)::text AS total
           FROM income_events
          WHERE effective_at >= $3::timestamptz
            AND effective_at < $4::timestamptz`,
        [organizationId, branchId, lastMonthStart, lastMonthEnd]
      ),
      // PT revenue this month
      query<{ total: string }>(
        `${incomeEventsCte}
         SELECT COALESCE(SUM(amount), 0)::text AS total
           FROM income_events
          WHERE effective_at >= $3::timestamptz
            AND payment_type = 'pt_package'`,
        [organizationId, branchId, thisMonthStart]
      ),
      // Active subscription count (for subtitle)
      query<{ count: string }>(
        `SELECT COUNT(DISTINCT member_id)::text AS count
         FROM subscriptions
         WHERE organization_id = $1 AND branch_id = $2
           AND is_active = true
           AND start_date <= $3
           AND end_date > $3`,
        [organizationId, branchId, accessNow]
      ),
    ]);

    return ok({
      totalRevenue: Number(totalRow?.total ?? 0),
      expectedMonthly: Number(expectedRow?.total ?? 0),
      thisMonthRevenue: Number(thisMonthRow?.total ?? 0),
      lastMonthRevenue: Number(lastMonthRow?.total ?? 0),
      ptRevenueThisMonth: Number(ptThisMonthRow?.total ?? 0),
      activeSubscriptionCount: Number(activeSubsRow?.count ?? expectedRow?.count ?? 0),
    });
  } catch (error) {
    return routeError(error);
  }
}
