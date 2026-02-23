import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaymentRow = {
  id: number;
  effective_at: string;
  name: string;
  phone: string;
  price_paid: string;
  plan_months: number;
  sessions_per_month: number | null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { organizationId, branchId } = await requireAuth(request);
    const { date } = await params;

    // Validate format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return ok([]);
    }

    let rows: PaymentRow[] = [];
    try {
      rows = await query<PaymentRow>(
        `SELECT s.id,
                COALESCE(s.updated_at, s.created_at) AS effective_at,
                m.name, m.phone,
                s.price_paid, s.plan_months, s.sessions_per_month
         FROM subscriptions s
         JOIN members m ON s.member_id = m.id
         WHERE s.organization_id = $1 AND s.branch_id = $2
           AND s.price_paid IS NOT NULL
           AND DATE(COALESCE(s.updated_at, s.created_at) AT TIME ZONE 'UTC') = $3
         ORDER BY COALESCE(s.updated_at, s.created_at) DESC`,
        [organizationId, branchId, date]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("updated_at")) throw error;
      rows = await query<PaymentRow>(
        `SELECT s.id,
                s.created_at AS effective_at,
                m.name, m.phone,
                s.price_paid, s.plan_months, s.sessions_per_month
         FROM subscriptions s
         JOIN members m ON s.member_id = m.id
         WHERE s.organization_id = $1 AND s.branch_id = $2
           AND s.price_paid IS NOT NULL
           AND DATE(s.created_at AT TIME ZONE 'UTC') = $3
         ORDER BY s.created_at DESC`,
        [organizationId, branchId, date]
      );
    }

    const data = rows.map((r) => ({
      id: r.id,
      date: r.effective_at,
      type: "subscription",
      name: r.name,
      amount: Number(r.price_paid),
      planMonths: r.plan_months,
      sessionsPerMonth: r.sessions_per_month,
    }));

    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}
