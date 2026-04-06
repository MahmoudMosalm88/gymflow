import { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { subscriptionRenewSchema } from "@/lib/validation";
import { calculateSubscriptionEndDateUnix } from "@/lib/subscription-dates";
import { deactivateExpiredSubscriptions } from "@/lib/subscription-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toUnixSeconds(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : null;
}

function toNullableBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

async function ensureSubscriptionPaymentMethodColumn() {
  await query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method TEXT`);
  await query(`ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_payment_method_check`);
  await query(`
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_payment_method_check
      CHECK (payment_method IN ('cash', 'digital') OR payment_method IS NULL)
  `);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    await ensureSubscriptionPaymentMethodColumn();
    const body = await request.json();
    const payload = subscriptionRenewSchema.parse(body);
    const expectedPreviousEndDate = toUnixSeconds((body as { expected_previous_end_date?: unknown })?.expected_previous_end_date);
    const expectedPreviousIsActive = toNullableBoolean((body as { expected_previous_is_active?: unknown })?.expected_previous_is_active);
    const now = Math.floor(Date.now() / 1000);
    await deactivateExpiredSubscriptions(auth.organizationId, auth.branchId, now);

    const output = await withTransaction(async (client) => {
      const memberRows = await client.query<{ id: string }>(
        `SELECT id
           FROM members
          WHERE id = $1
            AND organization_id = $2
            AND branch_id = $3
            AND deleted_at IS NULL
          FOR UPDATE`,
        [payload.member_id, auth.organizationId, auth.branchId]
      );
      if (!memberRows.rows[0]) {
        throw Object.assign(new Error("Member not found"), { statusCode: 404 });
      }

      const previousRows = await client.query<{
        id: number;
        member_id: string;
        start_date: number;
        end_date: number;
        plan_months: number;
        sessions_per_month: number | null;
        is_active: boolean;
      }>(
        `SELECT id, member_id, start_date, end_date, plan_months, sessions_per_month, is_active
           FROM subscriptions
          WHERE id = $1
            AND organization_id = $2
            AND branch_id = $3
          LIMIT 1`,
        [payload.previous_subscription_id, auth.organizationId, auth.branchId]
      );

      const previous = previousRows.rows[0];
      if (!previous) {
        throw Object.assign(new Error("Subscription not found"), { statusCode: 404 });
      }
      const previousEndDate = Number(previous.end_date);

      if (previous.member_id !== payload.member_id) {
        throw Object.assign(new Error("Subscription does not belong to this member"), { statusCode: 400 });
      }

      if (!previous.is_active && previousEndDate > now) {
        throw Object.assign(new Error("Only enabled subscription cycles can be renewed"), { statusCode: 400 });
      }

      if (
        (expectedPreviousEndDate !== null && previousEndDate !== expectedPreviousEndDate) ||
        (expectedPreviousIsActive !== null && previous.is_active !== expectedPreviousIsActive)
      ) {
        throw Object.assign(new Error("This subscription changed on another device. Review and try again."), {
          statusCode: 409,
          code: "offline_conflict",
        });
      }

      const nextStartDate = previousEndDate > now ? previousEndDate : now;
      const nextEndDate = calculateSubscriptionEndDateUnix(nextStartDate, payload.plan_months);

      const inserted = await client.query(
        `INSERT INTO subscriptions (
            organization_id,
            branch_id,
            member_id,
            renewed_from_subscription_id,
            start_date,
            end_date,
            plan_months,
            price_paid,
            payment_method,
            sessions_per_month,
            is_active
         ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true
         )
         RETURNING *`,
        [
          auth.organizationId,
          auth.branchId,
          payload.member_id,
          payload.previous_subscription_id,
          nextStartDate,
          nextEndDate,
          payload.plan_months,
          payload.price_paid ?? null,
          payload.payment_method ?? null,
          payload.sessions_per_month ?? previous.sessions_per_month ?? null
        ]
      );

      return inserted.rows[0];
    });

    return ok(output, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "statusCode" in error) {
      return fail(error instanceof Error ? error.message : "Request failed", Number((error as { statusCode: number }).statusCode), {
        code: typeof error === "object" && error && "code" in error ? (error as { code?: string }).code : undefined,
      });
    }
    return routeError(error);
  }
}
