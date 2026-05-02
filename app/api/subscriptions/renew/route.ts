import { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { subscriptionRenewSchema } from "@/lib/validation";
import { calculateSubscriptionEndDateUnix, getCurrentSubscriptionAccessReferenceUnix } from "@/lib/subscription-dates";
import { deactivateExpiredSubscriptions } from "@/lib/subscription-status";
import { ensurePlanTemplateSchema, loadPlanTemplateSnapshot } from "@/lib/plan-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureSubscriptionPaymentMethodColumn() {
  await ensurePlanTemplateSchema({ query: async (text, values = []) => ({ rows: await query(text, values as unknown[]) }) });
  await query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method TEXT`);
  await query(`ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_payment_method_check`);
  await query(`
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_payment_method_check
      CHECK (payment_method IN ('cash', 'digital') OR payment_method IS NULL)
  `);
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_renewed_from_unique
      ON subscriptions (renewed_from_subscription_id)
      WHERE renewed_from_subscription_id IS NOT NULL
  `);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    await ensureSubscriptionPaymentMethodColumn();
    const body = await request.json();
    const isOfflineSync = (body as { source?: unknown }).source === "offline_sync";
    const hasExpectedPreviousGuard =
      isOfflineSync &&
      (
        Object.prototype.hasOwnProperty.call(body, "expected_previous_end_date") ||
        Object.prototype.hasOwnProperty.call(body, "expected_previous_is_active")
      );
    const payload = subscriptionRenewSchema.parse(body);
    const accessNow = getCurrentSubscriptionAccessReferenceUnix();
    await deactivateExpiredSubscriptions(auth.organizationId, auth.branchId, accessNow);

    const output = await withTransaction(async (client) => {
      await ensurePlanTemplateSchema(client);
      const templateSnapshot = await loadPlanTemplateSnapshot(
        client,
        auth.organizationId,
        auth.branchId,
        payload.plan_template_id
      );

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
          LIMIT 1
          FOR UPDATE`,
        [payload.previous_subscription_id, auth.organizationId, auth.branchId]
      );

      const previous = previousRows.rows[0];
      if (!previous) {
        throw Object.assign(new Error("Subscription not found"), { statusCode: 404 });
      }
      const previousEndDate = Number(previous.end_date);

      if (
        hasExpectedPreviousGuard &&
        (
          (payload.expected_previous_end_date != null && previousEndDate !== payload.expected_previous_end_date) ||
          (payload.expected_previous_is_active != null && previous.is_active !== payload.expected_previous_is_active)
        )
      ) {
        throw Object.assign(new Error("This subscription changed on another device. Review and try again."), {
          statusCode: 409,
          code: "offline_conflict",
        });
      }

      if (previous.member_id !== payload.member_id) {
        throw Object.assign(new Error("Subscription does not belong to this member"), { statusCode: 400 });
      }

      if (!previous.is_active && previousEndDate > accessNow) {
        throw Object.assign(new Error("Only enabled subscription cycles can be renewed"), { statusCode: 400 });
      }

      const existingRenewalRows = await client.query(
        `SELECT *
           FROM subscriptions
          WHERE organization_id = $1
            AND branch_id = $2
            AND member_id = $3
            AND renewed_from_subscription_id = $4
          ORDER BY created_at DESC
          LIMIT 1`,
        [auth.organizationId, auth.branchId, payload.member_id, payload.previous_subscription_id]
      );

      if (existingRenewalRows.rows[0]) {
        return existingRenewalRows.rows[0];
      }

      const newerCycleRows = await client.query(
        `SELECT *
           FROM subscriptions
          WHERE organization_id = $1
            AND branch_id = $2
            AND member_id = $3
            AND id <> $4
            AND start_date >= $5
          ORDER BY start_date DESC, created_at DESC
          LIMIT 1`,
        [auth.organizationId, auth.branchId, payload.member_id, payload.previous_subscription_id, previousEndDate]
      );

      if (newerCycleRows.rows[0]) {
        if (!hasExpectedPreviousGuard) {
          return newerCycleRows.rows[0];
        }
        throw Object.assign(new Error("This member already has a newer subscription cycle. Refresh and review the latest state."), {
          statusCode: 409,
          code: "newer_cycle_exists",
        });
      }

      const nextStartDate = previousEndDate > accessNow ? previousEndDate : accessNow;
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
            plan_template_id,
            plan_template_name,
            plan_perks,
            freeze_days_allowed,
            guest_invites_allowed,
            is_active
         ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13::jsonb, $14, $15, true
         )
         ON CONFLICT (renewed_from_subscription_id)
           WHERE renewed_from_subscription_id IS NOT NULL
           DO NOTHING
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
          payload.sessions_per_month ?? previous.sessions_per_month ?? null,
          templateSnapshot?.planTemplateId ?? null,
          templateSnapshot?.planTemplateName ?? null,
          JSON.stringify(templateSnapshot?.planPerks ?? []),
          templateSnapshot?.freezeDaysAllowed ?? null,
          templateSnapshot?.guestInvitesAllowed ?? null
        ]
      );

      if (!inserted.rows[0]) {
        const existingRows = await client.query(
          `SELECT *
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
              AND member_id = $3
              AND renewed_from_subscription_id = $4
            ORDER BY created_at DESC
            LIMIT 1`,
          [auth.organizationId, auth.branchId, payload.member_id, payload.previous_subscription_id]
        );
        if (existingRows.rows[0]) return existingRows.rows[0];
      }

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
