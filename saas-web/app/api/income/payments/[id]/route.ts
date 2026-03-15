import { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { ensurePaymentsTable } from "@/lib/income-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParsedPaymentId =
  | { kind: "subscription"; id: number }
  | { kind: "renewal"; id: number }
  | { kind: "guest_pass"; id: string };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseDateInput(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parsePaymentId(raw: string): ParsedPaymentId | null {
  const value = String(raw || "").trim();
  const [kind, id] = value.split(":");
  if (!kind || !id) return null;

  if (kind === "subscription" || kind === "renewal") {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) return null;
    return { kind, id: numericId };
  }

  if (kind === "guest_pass" && isUuid(id)) {
    return { kind, id };
  }

  return null;
}

async function getRenewalTotal(
  organizationId: string,
  branchId: string,
  subscriptionId: number
) {
  const rows = await query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0)::text AS total
       FROM payments
      WHERE organization_id = $1
        AND branch_id = $2
        AND subscription_id = $3
        AND type = 'renewal'`,
    [organizationId, branchId, subscriptionId]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    await ensurePaymentsTable();
    const parsedId = parsePaymentId(String(params.id || ""));
    if (!parsedId) return fail("Invalid payment id.", 400);

    const payload = (await request.json()) as { amount?: unknown; date?: unknown };
    const hasAmount = payload.amount !== undefined;
    const hasDate = payload.date !== undefined;
    if (!hasAmount && !hasDate) return fail("Nothing to update.", 400);

    const nextAmount =
      hasAmount && payload.amount !== null
        ? Number(payload.amount)
        : payload.amount === null
          ? null
          : undefined;
    if (nextAmount !== undefined && nextAmount !== null && (!Number.isFinite(nextAmount) || nextAmount < 0)) {
      return fail("Amount must be a valid non-negative number.", 400);
    }

    const nextDate = hasDate ? parseDateInput(payload.date) : undefined;
    if (hasDate && !nextDate) return fail("Date must be a valid ISO date.", 400);

    if (parsedId.kind === "guest_pass") {
      const rows = await query(
        `UPDATE guest_passes
            SET amount = COALESCE($4::numeric, amount),
                used_at = COALESCE($5::timestamptz, used_at)
          WHERE id = $1
            AND organization_id = $2
            AND branch_id = $3
            AND used_at IS NOT NULL
            AND amount IS NOT NULL
        RETURNING id`,
        [parsedId.id, auth.organizationId, auth.branchId, nextAmount ?? null, nextDate?.toISOString() ?? null]
      );
      if (!rows[0]) return fail("Payment not found.", 404);
      return ok({ id: `guest_pass:${parsedId.id}`, type: "guest_pass", updated: true });
    }

    if (parsedId.kind === "renewal") {
      const updated = await withTransaction(async (client) => {
        const currentRows = await client.query<{
          id: number;
          amount: string;
          subscription_id: number | null;
        }>(
          `SELECT id, amount::text AS amount, subscription_id
             FROM payments
            WHERE id = $1
              AND organization_id = $2
              AND branch_id = $3
              AND type = 'renewal'
            LIMIT 1`,
          [parsedId.id, auth.organizationId, auth.branchId]
        );
        const current = currentRows.rows[0];
        if (!current) return false;

        const amountToWrite = nextAmount ?? Number(current.amount ?? 0);
        const amountDelta = amountToWrite - Number(current.amount ?? 0);

        await client.query(
          `UPDATE payments
              SET amount = $4::numeric,
                  created_at = COALESCE($5::timestamptz, created_at)
            WHERE id = $1
              AND organization_id = $2
              AND branch_id = $3
              AND type = 'renewal'`,
          [parsedId.id, auth.organizationId, auth.branchId, amountToWrite, nextDate?.toISOString() ?? null]
        );

        if (current.subscription_id && amountDelta !== 0) {
          await client.query(
            `UPDATE subscriptions
                SET price_paid = COALESCE(price_paid, 0)::numeric + $4::numeric
              WHERE id = $1
                AND organization_id = $2
                AND branch_id = $3`,
            [current.subscription_id, auth.organizationId, auth.branchId, amountDelta]
          );
        }

        return true;
      });
      if (!updated) return fail("Payment not found.", 404);
      return ok({ id: `renewal:${parsedId.id}`, type: "renewal", updated: true });
    }

    const currentRows = await query<{ price_paid: string }>(
      `SELECT price_paid::text AS price_paid
         FROM subscriptions
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
          AND price_paid IS NOT NULL
        LIMIT 1`,
      [parsedId.id, auth.organizationId, auth.branchId]
    );
    if (!currentRows[0]) return fail("Payment not found.", 404);

    const renewalTotal = await getRenewalTotal(auth.organizationId, auth.branchId, parsedId.id);
    const currentTotal = Number(currentRows[0].price_paid ?? 0);
    const currentBase = Math.max(0, currentTotal - renewalTotal);
    const nextBase = nextAmount ?? currentBase;
    const nextTotal = nextBase + renewalTotal;

    const rows = await query(
      `UPDATE subscriptions
          SET price_paid = $4::numeric,
              created_at = COALESCE($5::timestamptz, created_at)
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
      RETURNING id`,
      [parsedId.id, auth.organizationId, auth.branchId, nextTotal, nextDate?.toISOString() ?? null]
    );
    if (!rows[0]) return fail("Payment not found.", 404);
    return ok({ id: `subscription:${parsedId.id}`, type: "subscription", updated: true });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    await ensurePaymentsTable();
    const parsedId = parsePaymentId(String(params.id || ""));
    if (!parsedId) return fail("Invalid payment id.", 400);

    if (parsedId.kind === "guest_pass") {
      const rows = await query(
        `UPDATE guest_passes
            SET amount = NULL
          WHERE id = $1
            AND organization_id = $2
            AND branch_id = $3
            AND amount IS NOT NULL
        RETURNING id`,
        [parsedId.id, auth.organizationId, auth.branchId]
      );
      if (!rows[0]) return fail("Payment not found.", 404);
      return ok({ id: `guest_pass:${parsedId.id}`, type: "guest_pass", deleted: true });
    }

    if (parsedId.kind === "renewal") {
      const deleted = await withTransaction(async (client) => {
        const currentRows = await client.query<{
          amount: string;
          subscription_id: number | null;
        }>(
          `DELETE FROM payments
            WHERE id = $1
              AND organization_id = $2
              AND branch_id = $3
              AND type = 'renewal'
          RETURNING amount::text AS amount, subscription_id`,
          [parsedId.id, auth.organizationId, auth.branchId]
        );
        const current = currentRows.rows[0];
        if (!current) return false;

        if (current.subscription_id) {
          await client.query(
            `UPDATE subscriptions
                SET price_paid = GREATEST(COALESCE(price_paid, 0)::numeric - $4::numeric, 0::numeric)
              WHERE id = $1
                AND organization_id = $2
                AND branch_id = $3`,
            [current.subscription_id, auth.organizationId, auth.branchId, Number(current.amount ?? 0)]
          );
        }

        return true;
      });
      if (!deleted) return fail("Payment not found.", 404);
      return ok({ id: `renewal:${parsedId.id}`, type: "renewal", deleted: true });
    }

    const renewalTotal = await getRenewalTotal(auth.organizationId, auth.branchId, parsedId.id);
    const nextTotal = renewalTotal > 0 ? renewalTotal : null;
    const rows = await query(
      `UPDATE subscriptions
          SET price_paid = $4::numeric
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
          AND price_paid IS NOT NULL
      RETURNING id`,
      [parsedId.id, auth.organizationId, auth.branchId, nextTotal]
    );
    if (!rows[0]) return fail("Payment not found.", 404);
    return ok({ id: `subscription:${parsedId.id}`, type: "subscription", deleted: true });
  } catch (error) {
    return routeError(error);
  }
}
