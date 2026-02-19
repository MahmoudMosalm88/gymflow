import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaymentRow = {
  id: number;
  created_at: string;
  name: string;
  phone: string;
  price_paid: string;
  plan_months: number;
  sessions_per_month: number | null;
};

export async function GET(request: NextRequest) {
  try {
    const { organizationId, branchId } = await requireAuth(request);

    const url = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 10)));

    const rows = await query<PaymentRow>(
      `SELECT s.id, s.created_at, m.name, m.phone,
              s.price_paid, s.plan_months, s.sessions_per_month
       FROM subscriptions s
       JOIN members m ON s.member_id = m.id
       WHERE s.organization_id = $1 AND s.branch_id = $2
         AND s.price_paid IS NOT NULL
       ORDER BY s.created_at DESC
       LIMIT $3`,
      [organizationId, branchId, limit]
    );

    const data = rows.map((r) => ({
      id: r.id,
      date: r.created_at,
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
