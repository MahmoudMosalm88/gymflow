import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, fail, routeError } from "@/lib/http";
import { ensurePaymentsTable } from "@/lib/income-events";
import * as z from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paymentSchema = z.object({
  member_id: z.string().uuid(),
  amount: z.number().positive(),
  type: z.enum(["subscription", "renewal", "guest_pass", "pt_package", "other"]),
  subscription_id: z.number().int().positive().optional(),
  guest_pass_id: z.string().uuid().optional(),
  pt_package_id: z.string().uuid().optional(),
  payment_method: z.enum(["cash", "digital"]).optional().nullable(),
  note: z.string().max(500).optional(),
});

/**
 * GET /api/payments?member_id=xxx&limit=50
 * Returns payment history for a member.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const url = new URL(request.url);
    const memberId = url.searchParams.get("member_id");
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50)));

    if (!memberId) return fail("member_id is required", 400);

    await ensurePaymentsTable();

    // Combine explicit payment records with historical subscription payments
    // Subscriptions that already have a matching payment record are excluded
    const rows = await query(
      `(
        SELECT p.id, p.amount, p.type, p.payment_method, p.note, p.created_at,
               p.subscription_id, p.guest_pass_id, p.pt_package_id,
               s.plan_months, s.sessions_per_month,
               pkg.title AS package_title
          FROM payments p
          LEFT JOIN subscriptions s ON s.id = p.subscription_id
          LEFT JOIN pt_packages pkg ON pkg.id = p.pt_package_id
         WHERE p.organization_id = $1
           AND p.branch_id = $2
           AND p.member_id = $3
      )
      UNION ALL
      (
        SELECT -s.id AS id,
               s.price_paid AS amount,
               CASE
                 WHEN s.renewed_from_subscription_id IS NULL THEN 'subscription'
                 ELSE 'renewal'
               END AS type,
               s.payment_method,
               NULL AS note,
               s.created_at,
               s.id AS subscription_id,
               NULL::uuid AS guest_pass_id,
               NULL::uuid AS pt_package_id,
               s.plan_months,
               s.sessions_per_month,
               NULL::text AS package_title
          FROM subscriptions s
         WHERE s.organization_id = $1
           AND s.branch_id = $2
           AND s.member_id = $3
           AND s.price_paid IS NOT NULL
           AND s.price_paid > 0
           AND NOT EXISTS (
             SELECT 1 FROM payments p
              WHERE p.subscription_id = s.id
                AND p.type = 'subscription'
           )
      )
      ORDER BY created_at DESC
      LIMIT $4`,
      [auth.organizationId, auth.branchId, memberId, limit]
    );

    return ok(rows);
  } catch (error) {
    return routeError(error);
  }
}

/**
 * POST /api/payments
 * Records a new payment.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const payload = paymentSchema.parse(await request.json());

    await ensurePaymentsTable();

    const rows = await query(
      `INSERT INTO payments (organization_id, branch_id, member_id, amount, type, subscription_id, guest_pass_id, pt_package_id, payment_method, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        auth.organizationId,
        auth.branchId,
        payload.member_id,
        payload.amount,
        payload.type,
        payload.subscription_id || null,
        payload.guest_pass_id || null,
        payload.pt_package_id || null,
        payload.payment_method ?? null,
        payload.note || null,
      ]
    );

    return ok(rows[0], { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
