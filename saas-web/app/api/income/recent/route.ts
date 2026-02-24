import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  id: number | string;
  effective_at: string;
  name: string;
  phone: string | null;
  price_paid: string;
  plan_months: number;
  sessions_per_month: number | null;
  payment_type: string;
};

export async function GET(request: NextRequest) {
  try {
    const { organizationId, branchId } = await requireAuth(request);

    const url = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 10)));

    let rows: Row[] = [];
    try {
      rows = await query<Row>(
        `(
          SELECT s.id,
                 COALESCE(s.updated_at, s.created_at) AS effective_at,
                 m.name, m.phone,
                 s.price_paid, s.plan_months, s.sessions_per_month,
                 'subscription' AS payment_type
          FROM subscriptions s
          JOIN members m ON s.member_id = m.id
          WHERE s.organization_id = $1 AND s.branch_id = $2
            AND s.price_paid IS NOT NULL
        )
        UNION ALL
        (
          SELECT g.id::text AS id,
                 g.used_at AS effective_at,
                 g.member_name AS name, g.phone,
                 g.amount::text AS price_paid, 0 AS plan_months, NULL::int AS sessions_per_month,
                 'guest_pass' AS payment_type
          FROM guest_passes g
          WHERE g.organization_id = $1 AND g.branch_id = $2
            AND g.used_at IS NOT NULL AND g.amount IS NOT NULL
        )
        ORDER BY effective_at DESC
        LIMIT $3`,
        [organizationId, branchId, limit]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("updated_at")) throw error;
      rows = await query<Row>(
        `(
          SELECT s.id,
                 s.created_at AS effective_at,
                 m.name, m.phone,
                 s.price_paid, s.plan_months, s.sessions_per_month,
                 'subscription' AS payment_type
          FROM subscriptions s
          JOIN members m ON s.member_id = m.id
          WHERE s.organization_id = $1 AND s.branch_id = $2
            AND s.price_paid IS NOT NULL
        )
        UNION ALL
        (
          SELECT g.id::text AS id,
                 g.used_at AS effective_at,
                 g.member_name AS name, g.phone,
                 g.amount::text AS price_paid, 0 AS plan_months, NULL::int AS sessions_per_month,
                 'guest_pass' AS payment_type
          FROM guest_passes g
          WHERE g.organization_id = $1 AND g.branch_id = $2
            AND g.used_at IS NOT NULL AND g.amount IS NOT NULL
        )
        ORDER BY effective_at DESC
        LIMIT $3`,
        [organizationId, branchId, limit]
      );
    }

    const data = rows.map((r) => ({
      id: r.id,
      date: r.effective_at,
      type: r.payment_type,
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
