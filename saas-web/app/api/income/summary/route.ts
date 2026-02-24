import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { organizationId, branchId } = await requireAuth(request);

    const [[subTotal], [guestTotal], [expectedRows]] = await Promise.all([
      query<{ total: string }>(
        `SELECT COALESCE(SUM(price_paid), 0) AS total
         FROM subscriptions
         WHERE organization_id = $1 AND branch_id = $2 AND price_paid IS NOT NULL`,
        [organizationId, branchId]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM guest_passes
         WHERE organization_id = $1 AND branch_id = $2
           AND used_at IS NOT NULL AND amount IS NOT NULL`,
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
      totalRevenue: Number(subTotal?.total ?? 0) + Number(guestTotal?.total ?? 0),
      expectedMonthly: Number(expectedRows?.total ?? 0),
    });
  } catch (error) {
    return routeError(error);
  }
}
