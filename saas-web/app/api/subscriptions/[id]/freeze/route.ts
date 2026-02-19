import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, fail, routeError } from "@/lib/http";

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
    const { id } = await params;
    const subscriptionId = Number(id);
    if (!subscriptionId) return fail("Invalid subscription ID.", 400);

    const body = await request.json();
    const startDate = Number(body.startDate);
    const days = Number(body.days);

    if (!startDate || !days || days < 1 || days > 7) {
      return fail("Start date and days (1-7) are required.", 400);
    }

    const endDate = startDate + days * DAY_SECONDS;

    // Verify subscription exists, is active, and belongs to this org/branch
    const subRows = await query<{ id: number; end_date: number }>(
      `SELECT id, end_date FROM subscriptions
       WHERE id = $1 AND organization_id = $2 AND branch_id = $3 AND is_active = true
       LIMIT 1`,
      [subscriptionId, organizationId, branchId]
    );

    if (!subRows[0]) {
      return fail("Active subscription not found.", 404);
    }

    // Check for overlapping freezes
    const overlapRows = await query<{ id: number }>(
      `SELECT id FROM subscription_freezes
       WHERE subscription_id = $1 AND organization_id = $2 AND branch_id = $3
         AND start_date < $5 AND end_date > $4
       LIMIT 1`,
      [subscriptionId, organizationId, branchId, startDate, endDate]
    );

    if (overlapRows[0]) {
      return fail("A freeze already exists for this period.", 409);
    }

    // Insert freeze record
    const insertedRows = await query<FreezeRow>(
      `INSERT INTO subscription_freezes (organization_id, branch_id, subscription_id, start_date, end_date, days)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, start_date, end_date, days, created_at`,
      [organizationId, branchId, subscriptionId, startDate, endDate, days]
    );

    // Extend subscription end_date by the freeze days
    await query(
      `UPDATE subscriptions SET end_date = end_date + $1 WHERE id = $2`,
      [days * DAY_SECONDS, subscriptionId]
    );

    return ok(insertedRows[0]);
  } catch (error) {
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
