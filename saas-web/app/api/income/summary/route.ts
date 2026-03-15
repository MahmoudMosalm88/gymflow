import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { ensurePaymentsTable, incomeEventsCte } from "@/lib/income-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { organizationId, branchId } = await requireAuth(request);
    await ensurePaymentsTable();

    const [[totalRevenue], [expectedRows]] = await Promise.all([
      query<{ total: string }>(
        `${incomeEventsCte}
         SELECT COALESCE(SUM(amount), 0)::text AS total
           FROM income_events`,
        [organizationId, branchId]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(price_paid / NULLIF(plan_months, 0)), 0) AS total
         FROM subscriptions
         WHERE organization_id = $1 AND branch_id = $2
           AND is_active = true AND price_paid IS NOT NULL`,
        [organizationId, branchId]
      ),
    ]);

    return ok({
      totalRevenue: Number(totalRevenue?.total ?? 0),
      expectedMonthly: Number(expectedRows?.total ?? 0),
    });
  } catch (error) {
    return routeError(error);
  }
}
