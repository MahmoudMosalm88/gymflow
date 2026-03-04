import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaymentItem = {
  id: number | string;
  date: string;
  type: "subscription" | "guest_pass";
  name: string;
  amount: number;
  planMonths: number;
  sessionsPerMonth: number | null;
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
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 10)));

    // Subscription rows should always show if price_paid exists, even if member linkage drifted.
    const subscriptionRows = await query<{
      id: number | string;
      effective_at: unknown;
      name: string | null;
      price_paid: string | number;
      plan_months: number | null;
    }>(
      `SELECT s.id,
              s.created_at AS effective_at,
              (
                SELECT m.name
                  FROM members m
                 WHERE m.id = s.member_id
                   AND m.organization_id = s.organization_id
                   AND m.branch_id = s.branch_id
                 LIMIT 1
              ) AS name,
              s.price_paid,
              s.plan_months
         FROM subscriptions s
        WHERE s.organization_id = $1
          AND s.branch_id = $2
          AND s.price_paid IS NOT NULL`,
      [organizationId, branchId]
    );

    let guestRows: {
      id: string;
      effective_at: unknown;
      name: string | null;
      amount: string | number;
    }[] = [];

    // Guest pass schema can drift on older tenants; skip if missing columns/tables.
    try {
      guestRows = await query<{
        id: string;
        effective_at: unknown;
        name: string | null;
        amount: string | number;
      }>(
        `SELECT g.id::text AS id,
                g.used_at AS effective_at,
                g.member_name AS name,
                g.amount AS amount
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

    const payments: PaymentItem[] = [
      ...subscriptionRows.map((row) => ({
        id: row.id,
        date: toIso(row.effective_at),
        type: "subscription" as const,
        name: row.name?.trim() || "Unknown client",
        amount: Number(row.price_paid || 0),
        planMonths: Number(row.plan_months || 0),
        sessionsPerMonth: null,
      })),
      ...guestRows.map((row) => ({
        id: row.id,
        date: toIso(row.effective_at),
        type: "guest_pass" as const,
        name: row.name?.trim() || "Guest",
        amount: Number(row.amount || 0),
        planMonths: 0,
        sessionsPerMonth: null,
      })),
    ];

    payments.sort((a, b) => toMillis(b.date) - toMillis(a.date));
    return ok(payments.slice(0, limit));
  } catch (error) {
    return routeError(error);
  }
}
