import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  id: number | string;
  effective_at: unknown;
  name: string;
  price_paid: string | number;
  plan_months: number;
  sessions_per_month: number | null;
  payment_type: string;
};

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

    const url = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
    const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
    const search = url.searchParams.get("search")?.trim() || "";

    const subscriptionRows = await query<Row>(
      `SELECT s.id,
              s.created_at AS effective_at,
              COALESCE(
                (
                  SELECT m.name
                    FROM members m
                   WHERE m.id = s.member_id
                     AND m.organization_id = s.organization_id
                     AND m.branch_id = s.branch_id
                   LIMIT 1
                ),
                'Unknown client'
              ) AS name,
              s.price_paid,
              s.plan_months,
              NULL::int AS sessions_per_month,
              'subscription' AS payment_type
         FROM subscriptions s
        WHERE s.organization_id = $1
          AND s.branch_id = $2
          AND s.price_paid IS NOT NULL`,
      [organizationId, branchId]
    );

    let guestRows: Row[] = [];
    try {
      guestRows = await query<Row>(
        `SELECT g.id::text AS id,
                g.used_at AS effective_at,
                COALESCE(g.member_name, 'Guest') AS name,
                g.amount AS price_paid,
                0 AS plan_months,
                NULL::int AS sessions_per_month,
                'guest_pass' AS payment_type
           FROM guest_passes g
          WHERE g.organization_id = $1
            AND g.branch_id = $2
            AND g.used_at IS NOT NULL
            AND g.amount IS NOT NULL`,
        [organizationId, branchId]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        !message.includes("relation")
        && !message.includes("does not exist")
        && !message.includes("column")
      ) {
        throw error;
      }
    }

    const searchNeedle = search.toLowerCase();
    const merged = [...subscriptionRows, ...guestRows]
      .filter((row) => {
        if (!searchNeedle) return true;
        return String(row.name || "").toLowerCase().includes(searchNeedle);
      })
      .sort((a, b) => toMillis(b.effective_at) - toMillis(a.effective_at));

    const pageRows = merged.slice(offset, offset + limit + 1);
    const hasMore = pageRows.length > limit;
    const trimmed = hasMore ? pageRows.slice(0, limit) : pageRows;

    const data = trimmed.map((r) => ({
      id: r.id,
      date: toIso(r.effective_at),
      type: r.payment_type,
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
