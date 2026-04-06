import { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, fail, routeError } from "@/lib/http";
import { getCurrentSubscriptionAccessReferenceUnix } from "@/lib/subscription-dates";
import { deactivateExpiredSubscriptions } from "@/lib/subscription-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FreezeRow = {
  id: number;
  start_date: number;
  end_date: number;
  days: number;
  created_at: string;
};

const DAY_SECONDS = 86400;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId, branchId } = await requireAuth(request);
    await deactivateExpiredSubscriptions(organizationId, branchId, getCurrentSubscriptionAccessReferenceUnix());
    const { id } = await params;
    const subscriptionId = Number(id);
    if (!subscriptionId) return fail("Invalid subscription ID.", 400);

    const body = await request.json();
    const startDate = Number(body.startDate);
    const days = Number(body.days);
    const expectedSubscriptionEndDate = body.expected_subscription_end_date == null
      ? null
      : Number(body.expected_subscription_end_date);

    if (!startDate || !days || days < 1 || days > 7) {
      return fail("Start date and days (1-7) are required.", 400);
    }
    if (expectedSubscriptionEndDate !== null && !Number.isFinite(expectedSubscriptionEndDate)) {
      return fail("Invalid expected subscription state.", 400);
    }

    const endDate = startDate + days * DAY_SECONDS;

    const inserted = await withTransaction(async (client) => {
      const subRows = await client.query<{ id: number; end_date: number }>(
        `SELECT id, end_date
           FROM subscriptions
          WHERE id = $1
            AND organization_id = $2
            AND branch_id = $3
            AND is_active = true
          LIMIT 1
          FOR UPDATE`,
        [subscriptionId, organizationId, branchId]
      );

      const current = subRows.rows[0];
      if (!current) {
        throw Object.assign(new Error("Active subscription not found."), { statusCode: 404 });
      }
      const currentEndDate = Number(current.end_date);
      if (expectedSubscriptionEndDate !== null && currentEndDate !== expectedSubscriptionEndDate) {
        throw Object.assign(new Error("This subscription changed on another device. Review and try again."), {
          statusCode: 409,
          code: "offline_conflict",
        });
      }

      const overlapRows = await client.query<{ id: number }>(
        `SELECT id
           FROM subscription_freezes
          WHERE subscription_id = $1
            AND organization_id = $2
            AND branch_id = $3
            AND start_date < $5
            AND end_date > $4
          LIMIT 1`,
        [subscriptionId, organizationId, branchId, startDate, endDate]
      );

      if (overlapRows.rows[0]) {
        throw Object.assign(new Error("A freeze already exists for this period."), { statusCode: 409 });
      }

      const insertedRows = await client.query<FreezeRow>(
        `INSERT INTO subscription_freezes (organization_id, branch_id, subscription_id, start_date, end_date, days)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, start_date, end_date, days, created_at`,
        [organizationId, branchId, subscriptionId, startDate, endDate, days]
      );

      await client.query(
        `UPDATE subscriptions
            SET end_date = end_date + $1
          WHERE id = $2`,
        [days * DAY_SECONDS, subscriptionId]
      );

      return insertedRows.rows[0];
    });

    return ok(inserted);
  } catch (error) {
    if (typeof error === "object" && error && "statusCode" in error) {
      return fail(error instanceof Error ? error.message : "Request failed", Number((error as { statusCode: number }).statusCode), {
        code: typeof error === "object" && error && "code" in error ? (error as { code?: string }).code : undefined,
      });
    }
    return routeError(error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId, branchId } = await requireAuth(request);
    const { id } = await params;
    const subscriptionId = Number(id);
    if (!subscriptionId) return fail("Invalid subscription ID.", 400);

    const rows = await query<FreezeRow>(
      `SELECT id, start_date, end_date, days, created_at
       FROM subscription_freezes
       WHERE subscription_id = $1 AND organization_id = $2 AND branch_id = $3
       ORDER BY created_at DESC`,
      [subscriptionId, organizationId, branchId]
    );

    return ok(rows);
  } catch (error) {
    return routeError(error);
  }
}
