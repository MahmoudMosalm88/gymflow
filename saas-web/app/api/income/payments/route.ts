import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { ensurePaymentsTable, incomeEventsCte, type IncomeEventRow } from "@/lib/income-events";
import { toIsoString, toMillis } from "@/lib/coerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { organizationId, branchId } = await requireAuth(request);
    await ensurePaymentsTable();

    const url = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
    const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
    const search = url.searchParams.get("search")?.trim() || "";

    const searchNeedle = search.toLowerCase();
    const eventRows = await query<IncomeEventRow>(
      `${incomeEventsCte}
       SELECT event_id,
              effective_at,
              member_name,
              amount,
              payment_method,
              plan_months,
              sessions_per_month,
              payment_type,
              package_title
         FROM income_events
        ORDER BY effective_at DESC`,
      [organizationId, branchId]
    );

    const merged = eventRows
      .filter((row) => {
        if (!searchNeedle) return true;
        return String(row.member_name || "").toLowerCase().includes(searchNeedle);
      })
      .sort((a, b) => toMillis(b.effective_at) - toMillis(a.effective_at));

    const pageRows = merged.slice(offset, offset + limit + 1);
    const hasMore = pageRows.length > limit;
    const trimmed = hasMore ? pageRows.slice(0, limit) : pageRows;

    const data = trimmed.map((r) => ({
      id: r.event_id,
      date: toIsoString(r.effective_at),
      type: r.payment_type,
      name: r.member_name,
      amount: Number(r.amount),
      paymentMethod: r.payment_method,
      planMonths: r.plan_months,
      sessionsPerMonth: r.sessions_per_month,
      packageTitle: r.package_title ?? null,
    }));

    return ok({ data, hasMore });
  } catch (error) {
    return routeError(error);
  }
}
