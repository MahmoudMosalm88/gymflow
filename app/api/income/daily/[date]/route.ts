import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { ensurePaymentsTable, incomeEventsCte, type IncomeEventRow } from "@/lib/income-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { organizationId, branchId } = await requireAuth(request);
    await ensurePaymentsTable();
    const { date } = await params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return ok([]);
    }

    const rows = await query<IncomeEventRow>(
      `${incomeEventsCte}
       SELECT event_id,
              effective_at,
              member_name,
              phone,
              amount,
              plan_months,
              sessions_per_month,
              payment_type
         FROM income_events
        WHERE DATE(effective_at AT TIME ZONE 'UTC') = $3
        ORDER BY effective_at DESC`,
      [organizationId, branchId, date]
    );

    const data = rows.map((r) => ({
      id: r.event_id,
      date: r.effective_at,
      type: r.payment_type,
      name: r.member_name,
      amount: Number(r.amount),
      planMonths: r.plan_months,
      sessionsPerMonth: r.sessions_per_month,
    }));

    return ok(data);
  } catch (error) {
    console.error("[income/daily]", error);
    return routeError(error);
  }
}
