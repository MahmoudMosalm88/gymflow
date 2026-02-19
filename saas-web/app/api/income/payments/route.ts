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
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
    const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
    const search = url.searchParams.get("search")?.trim() || "";

    const params: (string | number)[] = [organizationId, branchId, limit + 1, offset];
    let searchClause = "";
    if (search) {
      searchClause = `AND m.name ILIKE $5`;
      params.push(`%${search}%`);
    }

    const rows = await query<PaymentRow>(
      `SELECT s.id, s.created_at, m.name, m.phone,
              s.price_paid, s.plan_months, s.sessions_per_month
       FROM subscriptions s
       JOIN members m ON s.member_id = m.id
       WHERE s.organization_id = $1 AND s.branch_id = $2
         AND s.price_paid IS NOT NULL
         ${searchClause}
       ORDER BY s.created_at DESC
       LIMIT $3 OFFSET $4`,
      params
    );

    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;

    const data = trimmed.map((r) => ({
      id: r.id,
      date: r.created_at,
      type: "subscription",
      name: r.name,
      amount: Number(r.price_paid),
      planMonths: r.plan_months,
      sessionsPerMonth: r.sessions_per_month,
    }));

    return ok({ data, hasMore });
  } catch (error) {
    return routeError(error);
  }
}
