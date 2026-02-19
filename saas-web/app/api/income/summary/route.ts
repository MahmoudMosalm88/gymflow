import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { organizationId, branchId } = await requireAuth(request);

    const [totalRows] = await query<{ total: string }>(
      `SELECT COALESCE(SUM(price_paid), 0) AS total
       FROM subscriptions
       WHERE organization_id = $1 AND branch_id = $2 AND price_paid IS NOT NULL`,
      [organizationId, branchId]
    );

    const [expectedRows] = await query<{ total: string }>(
      `SELECT COALESCE(SUM(price_paid / NULLIF(plan_months, 0)), 0) AS total
       FROM subscriptions
       WHERE organization_id = $1 AND branch_id = $2
         AND is_active = true AND price_paid IS NOT NULL`,
      [organizationId, branchId]
    );

    return ok({
      totalRevenue: Number(totalRows?.total ?? 0),
      expectedMonthly: Number(expectedRows?.total ?? 0),
    });
  } catch (error) {
    return routeError(error);
  }
}
