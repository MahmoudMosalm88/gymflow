import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseDateInput(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    const id = String(params.id || "").trim();
    if (!id) return fail("Payment id is required.", 400);

    const payload = (await request.json()) as { amount?: unknown; date?: unknown };
    const hasAmount = payload.amount !== undefined;
    const hasDate = payload.date !== undefined;
    if (!hasAmount && !hasDate) {
      return fail("Nothing to update.", 400);
    }

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
    if (hasDate && !nextDate) {
      return fail("Date must be a valid ISO date.", 400);
    }

    if (isUuid(id)) {
      // Guest pass payment: income uses amount + used_at.
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
        [id, auth.organizationId, auth.branchId, nextAmount ?? null, nextDate?.toISOString() ?? null]
      );
      if (!rows[0]) return fail("Payment not found.", 404);
      return ok({ id, type: "guest_pass", updated: true });
    }

    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return fail("Invalid payment id.", 400);
    }

    // Subscription payment: income uses price_paid + created_at.
    const rows = await query(
      `UPDATE subscriptions
          SET price_paid = COALESCE($4::numeric, price_paid),
              created_at = COALESCE($5::timestamptz, created_at)
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
          AND price_paid IS NOT NULL
      RETURNING id`,
      [numericId, auth.organizationId, auth.branchId, nextAmount ?? null, nextDate?.toISOString() ?? null]
    );
    if (!rows[0]) return fail("Payment not found.", 404);
    return ok({ id: numericId, type: "subscription", updated: true });
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
    const id = String(params.id || "").trim();
    if (!id) return fail("Payment id is required.", 400);

    if (isUuid(id)) {
      // Remove guest-pass payment from income views while keeping guest pass record.
      const rows = await query(
        `UPDATE guest_passes
            SET amount = NULL
          WHERE id = $1
            AND organization_id = $2
            AND branch_id = $3
            AND amount IS NOT NULL
        RETURNING id`,
        [id, auth.organizationId, auth.branchId]
      );
      if (!rows[0]) return fail("Payment not found.", 404);
      return ok({ id, type: "guest_pass", deleted: true });
    }

    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return fail("Invalid payment id.", 400);
    }

    // Remove subscription payment from income/report sums while keeping subscription row.
    const rows = await query(
      `UPDATE subscriptions
          SET price_paid = NULL
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
          AND price_paid IS NOT NULL
      RETURNING id`,
      [numericId, auth.organizationId, auth.branchId]
    );
    if (!rows[0]) return fail("Payment not found.", 404);
    return ok({ id: numericId, type: "subscription", deleted: true });
  } catch (error) {
    return routeError(error);
  }
}

