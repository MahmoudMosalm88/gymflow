import { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { subscriptionPatchSchema, subscriptionSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const url = new URL(request.url);
    const memberId = url.searchParams.get("member_id");

    const rows = await query(
      `SELECT *
         FROM subscriptions
        WHERE organization_id = $1
          AND branch_id = $2
          AND ($3::uuid IS NULL OR member_id = $3::uuid)
        ORDER BY created_at DESC
        LIMIT 500`,
      [auth.organizationId, auth.branchId, memberId]
    );

    return ok(rows);
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const payload = subscriptionSchema.parse(await request.json());

    const output = await withTransaction(async (client) => {
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
            plan_months, price_paid, sessions_per_month, is_active
         ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, true
         )
         RETURNING *`,
        [
          auth.organizationId,
          auth.branchId,
          payload.member_id,
          payload.start_date,
          payload.end_date,
          payload.plan_months,
          payload.price_paid || null,
          payload.sessions_per_month || null
        ]
      );

      return inserted.rows[0];
    });

    return ok(output, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const payload = subscriptionPatchSchema.parse(await request.json());

    const rows = await query(
      `UPDATE subscriptions
          SET is_active = COALESCE($4, is_active),
              price_paid = COALESCE($5, price_paid)
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
      RETURNING *`,
      [payload.id, auth.organizationId, auth.branchId, payload.is_active, payload.price_paid]
    );

    if (!rows[0]) return fail("Subscription not found", 404);
    return ok(rows[0]);
  } catch (error) {
    return routeError(error);
  }
}
