import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { ensurePaymentsTable, incomeEventsCte, type IncomeEventRow } from "@/lib/income-events";
import { toIsoString, toMillis } from "@/lib/coerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaymentItem = {
  id: number | string;
  date: string;
  type: "subscription" | "renewal" | "guest_pass" | "pt_package";
  name: string;
  amount: number;
  planMonths: number;
  sessionsPerMonth: number | null;
  packageTitle?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const { organizationId, branchId } = await requireAuth(request);
    await ensurePaymentsTable();
    const url = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 10)));

    const rows = await query<IncomeEventRow>(
      `${incomeEventsCte}
       SELECT event_id,
              effective_at,
              payment_type,
              member_name,
              amount,
              plan_months,
              sessions_per_month,
              package_title
         FROM income_events
        ORDER BY effective_at DESC`,
      [organizationId, branchId]
    );

    const payments: PaymentItem[] = rows.map((row) => ({
      id: row.event_id,
      date: toIsoString(row.effective_at),
      type: row.payment_type,
      name: row.member_name?.trim() || "Unknown client",
      amount: Number(row.amount || 0),
      planMonths: Number(row.plan_months || 0),
      sessionsPerMonth: row.sessions_per_month,
      packageTitle: row.package_title ?? null,
    }));

    payments.sort((a, b) => toMillis(b.date) - toMillis(a.date));
    return ok(payments.slice(0, limit));
  } catch (error) {
    return routeError(error);
  }
}
