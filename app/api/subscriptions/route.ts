import { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { subscriptionPatchSchema, subscriptionSchema } from "@/lib/validation";
import { calculateSubscriptionEndDateUnix, getCurrentSubscriptionAccessReferenceUnix } from "@/lib/subscription-dates";
import { deactivateExpiredSubscriptions } from "@/lib/subscription-status";
import { toNullablePositiveInt } from "@/lib/coerce";
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
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const url = new URL(request.url);
    const memberId = url.searchParams.get("member_id");
    const includeHistory = url.searchParams.get("include_history") === "1" || Boolean(memberId);
    const accessNow = getCurrentSubscriptionAccessReferenceUnix();
    await deactivateExpiredSubscriptions(auth.organizationId, auth.branchId, accessNow);

    const rows = includeHistory
      ? await query(
          `SELECT s.*,
                  m.name AS member_name,
                  CASE
                    WHEN s.is_active = true AND s.start_date <= $4 AND s.end_date > $4 AND s.sessions_per_month IS NOT NULL
                      THEN GREATEST(COALESCE(q.sessions_cap, s.sessions_per_month) - COALESCE(q.sessions_used, 0), 0)
                    ELSE NULL
                  END AS sessions_remaining
             FROM subscriptions s
             JOIN members m
               ON m.id = s.member_id
              AND m.organization_id = s.organization_id
              AND m.branch_id = s.branch_id
              AND m.deleted_at IS NULL
             LEFT JOIN LATERAL (
               SELECT q.sessions_used, q.sessions_cap
                 FROM quotas q
                WHERE q.subscription_id = s.id
                  AND q.organization_id = s.organization_id
                  AND q.branch_id = s.branch_id
                  AND q.cycle_start <= $4
                  AND q.cycle_end > $4
                ORDER BY q.cycle_start DESC
                LIMIT 1
             ) q ON true
            WHERE s.organization_id = $1
              AND s.branch_id = $2
              AND ($3::uuid IS NULL OR s.member_id = $3::uuid)
            ORDER BY
              CASE
                WHEN s.is_active = true AND s.start_date <= $4 AND s.end_date > $4 THEN 0
                WHEN s.is_active = true AND s.start_date > $4 THEN 1
                WHEN s.is_active = true THEN 2
                ELSE 3
              END,
              s.start_date DESC,
              s.end_date DESC,
              s.created_at DESC
            LIMIT 500`,
          [auth.organizationId, auth.branchId, memberId, accessNow]
        )
      : await query(
          `WITH ranked AS (
             SELECT s.*,
                    m.name AS member_name,
                    CASE
                      WHEN s.is_active = true AND s.start_date <= $3 AND s.end_date > $3 AND s.sessions_per_month IS NOT NULL
                        THEN GREATEST(COALESCE(q.sessions_cap, s.sessions_per_month) - COALESCE(q.sessions_used, 0), 0)
                      ELSE NULL
                    END AS sessions_remaining,
                    ROW_NUMBER() OVER (
                      PARTITION BY s.member_id
                      ORDER BY
                        CASE
                          WHEN s.is_active = true AND s.start_date <= $3 AND s.end_date > $3 THEN 0
                          WHEN s.is_active = true AND s.start_date > $3 THEN 1
                          WHEN s.is_active = true THEN 2
                          ELSE 3
                        END,
                        s.start_date DESC,
                        s.end_date DESC,
                        s.created_at DESC
                    ) AS rn
               FROM subscriptions s
               JOIN members m
                 ON m.id = s.member_id
                AND m.organization_id = s.organization_id
                AND m.branch_id = s.branch_id
                AND m.deleted_at IS NULL
               LEFT JOIN LATERAL (
                 SELECT q.sessions_used, q.sessions_cap
                   FROM quotas q
                  WHERE q.subscription_id = s.id
                    AND q.organization_id = s.organization_id
                    AND q.branch_id = s.branch_id
                    AND q.cycle_start <= $3
                    AND q.cycle_end > $3
                  ORDER BY q.cycle_start DESC
                  LIMIT 1
               ) q ON true
              WHERE s.organization_id = $1
                AND s.branch_id = $2
           )
           SELECT id,
                  organization_id,
                  branch_id,
                  member_id,
                  member_name,
                  renewed_from_subscription_id,
                  start_date,
                  end_date,
                  plan_months,
                  price_paid,
                  sessions_per_month,
                  sessions_remaining,
                  is_active,
                  created_at
             FROM ranked
            WHERE rn = 1
            ORDER BY created_at DESC
            LIMIT 500`,
          [auth.organizationId, auth.branchId, accessNow]
        );

    return ok(rows);
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    await ensureSubscriptionPaymentMethodColumn();
    const body = await request.json();
    const payload = subscriptionSchema.parse(body);
    const isOfflineSync = (body as { source?: unknown }).source === "offline_sync";
    const hasExpectedActiveSubscriptionGuard =
      isOfflineSync &&
      Object.prototype.hasOwnProperty.call(body, "expected_active_subscription_id");
    const expectedActiveSubscriptionId = toNullablePositiveInt((body as { expected_active_subscription_id?: unknown })?.expected_active_subscription_id);
    const accessNow = getCurrentSubscriptionAccessReferenceUnix();
    await deactivateExpiredSubscriptions(auth.organizationId, auth.branchId, accessNow);
    const hasLegacyEndDate =
      typeof payload.end_date === "number" &&
      Number.isFinite(payload.end_date) &&
      payload.end_date > payload.start_date;
    const endDate = hasLegacyEndDate
      ? payload.end_date
      : calculateSubscriptionEndDateUnix(payload.start_date, payload.plan_months);

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

      const currentRows = await client.query<{ id: number }>(
        `SELECT id
           FROM subscriptions
          WHERE organization_id = $1
            AND branch_id = $2
            AND member_id = $3
            AND is_active = true
          ORDER BY
            CASE
              WHEN start_date <= $4 AND end_date > $4 THEN 0
              WHEN start_date > $4 THEN 1
              ELSE 3
            END,
            start_date DESC,
            end_date DESC,
            created_at DESC
          LIMIT 1`,
        [auth.organizationId, auth.branchId, payload.member_id, accessNow]
      );

      const currentId = currentRows.rows[0]?.id ?? null;
      let allowExpiredExpectedSubscription = false;
      if (
        hasExpectedActiveSubscriptionGuard &&
        currentId !== expectedActiveSubscriptionId &&
        currentId === null &&
        expectedActiveSubscriptionId !== null
      ) {
        const expectedRows = await client.query<{ id: number; end_date: number; is_active: boolean }>(
          `SELECT id, end_date, is_active
             FROM subscriptions
            WHERE id = $1
              AND organization_id = $2
              AND branch_id = $3
              AND member_id = $4
            LIMIT 1`,
          [expectedActiveSubscriptionId, auth.organizationId, auth.branchId, payload.member_id]
        );
        const expectedCurrent = expectedRows.rows[0];
        if (expectedCurrent && (!expectedCurrent.is_active || Number(expectedCurrent.end_date) <= accessNow)) {
          allowExpiredExpectedSubscription = true;
        }
      }

      if (
        hasExpectedActiveSubscriptionGuard &&
        currentId !== expectedActiveSubscriptionId &&
        !allowExpiredExpectedSubscription
      ) {
        throw Object.assign(new Error("This member's subscription changed on another device. Review and try again."), {
          statusCode: 409,
          code: "offline_conflict",
        });
      }

      await client.query(
        `UPDATE subscriptions
            SET is_active = false
          WHERE organization_id = $1
            AND branch_id = $2
            AND member_id = $3
            AND is_active = true`,
        [auth.organizationId, auth.branchId, payload.member_id]
      );

      const inserted = await client.query(
        `INSERT INTO subscriptions (
            organization_id, branch_id, member_id, start_date, end_date,
            plan_months, price_paid, payment_method, sessions_per_month,
            plan_template_id, plan_template_name, plan_perks,
            freeze_days_allowed, guest_invites_allowed, is_active
         ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11, $12::jsonb,
            $13, $14, true
         )
         RETURNING *`,
        [
          auth.organizationId,
          auth.branchId,
          payload.member_id,
          payload.start_date,
          endDate,
          payload.plan_months,
          payload.price_paid || null,
          payload.payment_method ?? null,
          payload.sessions_per_month || null,
          templateSnapshot?.planTemplateId ?? null,
          templateSnapshot?.planTemplateName ?? null,
          JSON.stringify([]),
          templateSnapshot?.freezeDaysAllowed ?? null,
          templateSnapshot?.guestInvitesAllowed ?? null
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

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    await ensureSubscriptionPaymentMethodColumn();
    const payload = subscriptionPatchSchema.parse(await request.json());
    const accessNow = getCurrentSubscriptionAccessReferenceUnix();
    await deactivateExpiredSubscriptions(auth.organizationId, auth.branchId, accessNow);

    const currentRows = await query<{
      id: number;
      start_date: number;
      end_date: number;
      plan_months: number;
      price_paid: number | null;
      payment_method: "cash" | "digital" | null;
      sessions_per_month: number | null;
      is_active: boolean;
    }>(
      `SELECT id, start_date, end_date, plan_months, price_paid, payment_method, sessions_per_month, is_active
         FROM subscriptions
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
        LIMIT 1`,
      [payload.id, auth.organizationId, auth.branchId]
    );
    if (!currentRows[0]) return fail("Subscription not found", 404);

    const current = currentRows[0];
    const nextStart = payload.start_date ?? current.start_date;
    const nextPlanMonths = payload.plan_months ?? current.plan_months;
    const nextEnd =
      payload.end_date ??
      (payload.start_date !== undefined || payload.plan_months !== undefined
        ? calculateSubscriptionEndDateUnix(nextStart, nextPlanMonths)
        : current.end_date);

    const rows = await query(
      `UPDATE subscriptions
          SET is_active = COALESCE($4, is_active),
              price_paid = COALESCE($5, price_paid),
              payment_method = COALESCE($6, payment_method),
              start_date = $7,
              end_date = $8,
              plan_months = $9,
              sessions_per_month = COALESCE($10, sessions_per_month)
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
      RETURNING *`,
      [
        payload.id,
        auth.organizationId,
        auth.branchId,
        payload.is_active,
        payload.price_paid,
        payload.payment_method,
        nextStart,
        nextEnd,
        nextPlanMonths,
        payload.sessions_per_month
      ]
    );

    if (!rows[0]) return fail("Subscription not found", 404);
    return ok(rows[0]);
  } catch (error) {
    return routeError(error);
  }
}
