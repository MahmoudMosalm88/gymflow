import { NextRequest } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { subscriptionRenewSchema } from "@/lib/validation";
import { calculateSubscriptionEndDateUnix } from "@/lib/subscription-dates";
import { deactivateExpiredSubscriptions } from "@/lib/subscription-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const payload = subscriptionRenewSchema.parse(await request.json());
    const now = Math.floor(Date.now() / 1000);
    await deactivateExpiredSubscriptions(auth.organizationId, auth.branchId, now);

    const output = await withTransaction(async (client) => {
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
        throw new Error("Subscription not found");
      }

      if (previous.member_id !== payload.member_id) {
        throw new Error("Subscription does not belong to this member");
      }

      if (!previous.is_active && previous.end_date > now) {
        throw new Error("Only enabled subscription cycles can be renewed");
      }

      const nextStartDate = previous.end_date > now ? previous.end_date : now;
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
            sessions_per_month,
            is_active
         ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, true
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
          payload.sessions_per_month ?? previous.sessions_per_month ?? null
        ]
      );

      return inserted.rows[0];
    });

    return ok(output, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Subscription not found") {
      return fail(error.message, 404);
    }
    if (
      error instanceof Error &&
      (error.message === "Subscription does not belong to this member" ||
        error.message === "Only enabled subscription cycles can be renewed")
    ) {
      return fail(error.message, 400);
    }
    return routeError(error);
  }
}
