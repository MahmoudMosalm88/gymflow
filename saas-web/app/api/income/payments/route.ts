import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { ensurePaymentsTable, incomeEventsCte, type IncomeEventRow } from "@/lib/income-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toMillis(input: unknown): number {
  if (input instanceof Date) return input.getTime();
  if (typeof input === "number" && Number.isFinite(input)) {
    return input > 1_000_000_000_000 ? input : input * 1000;
  }
  if (typeof input === "string") {
    const n = Number(input);
    if (Number.isFinite(n)) return n > 1_000_000_000_000 ? n : n * 1000;
    const parsed = Date.parse(input);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function toIso(input: unknown): string {
  const ms = toMillis(input);
  if (!ms) return new Date(0).toISOString();
  return new Date(ms).toISOString();
}

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
              plan_months,
              sessions_per_month,
              payment_type
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
      date: toIso(r.effective_at),
      type: r.payment_type,
      name: r.member_name,
      amount: Number(r.amount),
      planMonths: r.plan_months,
      sessionsPerMonth: r.sessions_per_month,
    }));

    return ok({ data, hasMore });
  } catch (error) {
    return routeError(error);
  }
}
