import { NextRequest } from "next/server";
import { PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { findActiveInviteCycle, getGuestInviteAllowance } from "@/lib/guest-invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Queryable = Pick<PoolClient, "query">;

type GuestPassRow = {
  id: string;
  code: string;
  member_name: string;
  phone: string | null;
  amount: string | null;
  inviter_member_id: string | null;
  inviter_subscription_id: number | null;
  inviter_name: string | null;
  expires_at: string;
  used_at: string | null;
  voided_at: string | null;
  converted_member_id: string | null;
  converted_at: string | null;
  converted_member_name: string | null;
  created_at: string;
};

function generateCode() {
  return `GP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function ensureGuestPassColumns() {
  await query(`ALTER TABLE guest_passes ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2)`);
  await query(`ALTER TABLE guest_passes ADD COLUMN IF NOT EXISTS inviter_member_id uuid REFERENCES members(id) ON DELETE SET NULL`);
  await query(`ALTER TABLE guest_passes ADD COLUMN IF NOT EXISTS inviter_subscription_id bigint REFERENCES subscriptions(id) ON DELETE SET NULL`);
  await query(`ALTER TABLE guest_passes ADD COLUMN IF NOT EXISTS voided_at timestamptz`);
  await query(`ALTER TABLE guest_passes ADD COLUMN IF NOT EXISTS converted_member_id uuid REFERENCES members(id) ON DELETE SET NULL`);
  await query(`ALTER TABLE guest_passes ADD COLUMN IF NOT EXISTS converted_at timestamptz`);
  await query(`CREATE INDEX IF NOT EXISTS idx_guest_passes_inviter_cycle ON guest_passes (organization_id, branch_id, inviter_subscription_id, created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_guest_passes_inviter_member ON guest_passes (organization_id, branch_id, inviter_member_id, created_at DESC)`);
}

async function selectGuestPass(
  executor: Queryable,
  organizationId: string,
  branchId: string,
  id: string
): Promise<GuestPassRow | null> {
  const result = await executor.query<GuestPassRow>(
    `SELECT gp.id,
            gp.code,
            gp.member_name,
            gp.phone,
            gp.amount,
            gp.inviter_member_id,
            gp.inviter_subscription_id,
            inviter.name AS inviter_name,
            gp.expires_at,
            gp.used_at,
            gp.voided_at,
            gp.converted_member_id,
            gp.converted_at,
            converted.name AS converted_member_name,
            gp.created_at
       FROM guest_passes gp
       LEFT JOIN members inviter
         ON inviter.id = gp.inviter_member_id
        AND inviter.organization_id = gp.organization_id
        AND inviter.branch_id = gp.branch_id
       LEFT JOIN members converted
         ON converted.id = gp.converted_member_id
        AND converted.organization_id = gp.organization_id
        AND converted.branch_id = gp.branch_id
      WHERE gp.id = $1
        AND gp.organization_id = $2
        AND gp.branch_id = $3
      LIMIT 1`,
    [id, organizationId, branchId]
  );
  return result.rows[0] ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    await ensureGuestPassColumns();
    const rows = await query<GuestPassRow>(
      `SELECT gp.id,
              gp.code,
              gp.member_name,
              gp.phone,
              gp.amount,
              gp.inviter_member_id,
              gp.inviter_subscription_id,
              inviter.name AS inviter_name,
              gp.expires_at,
              gp.used_at,
              gp.voided_at,
              gp.converted_member_id,
              gp.converted_at,
              converted.name AS converted_member_name,
              gp.created_at
         FROM guest_passes gp
         LEFT JOIN members inviter
           ON inviter.id = gp.inviter_member_id
          AND inviter.organization_id = gp.organization_id
          AND inviter.branch_id = gp.branch_id
         LEFT JOIN members converted
           ON converted.id = gp.converted_member_id
          AND converted.organization_id = gp.organization_id
          AND converted.branch_id = gp.branch_id
        WHERE gp.organization_id = $1
          AND gp.branch_id = $2
        ORDER BY gp.created_at DESC
        LIMIT 200`,
      [auth.organizationId, auth.branchId]
    );
    return ok(rows);
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    await ensureGuestPassColumns();
    const body = (await request.json()) as {
      member_name?: string;
      phone?: string;
      amount?: number;
      expires_at?: string;
      inviter_member_id?: string;
    };

    const memberName = String(body.member_name || "").trim();
    if (memberName.length < 2) return fail("Guest name is required", 400);

    const amount = body.amount != null ? Number(body.amount) : null;
    if (amount != null && (isNaN(amount) || amount < 0)) return fail("Invalid amount", 400);

    const expiresAt = body.expires_at ? new Date(body.expires_at) : new Date(Date.now() + 24 * 3600 * 1000);
    if (Number.isNaN(expiresAt.getTime())) return fail("Invalid expiry date", 400);

    const code = generateCode();
    const created = await withTransaction(async (client) => {
      let inviterMemberId: string | null = null;
      let inviterSubscriptionId: number | null = null;

      if (body.inviter_member_id) {
        const allowance = await getGuestInviteAllowance(client, auth.organizationId, auth.branchId);
        const currentCycle = await findActiveInviteCycle(
          client,
          auth.organizationId,
          auth.branchId,
          body.inviter_member_id
        );

        if (!currentCycle) {
          throw new Error("Inviting member needs an active subscription cycle");
        }

        const usedRows = await client.query<{ total: string | number }>(
          `SELECT COUNT(*)::int AS total
             FROM guest_passes
            WHERE organization_id = $1
              AND branch_id = $2
              AND inviter_subscription_id = $3
              AND voided_at IS NULL`,
          [auth.organizationId, auth.branchId, currentCycle.id]
        );
        const used = Number(usedRows.rows[0]?.total || 0);

        if (used >= allowance) {
          throw new Error("Guest invite limit reached for this cycle");
        }

        inviterMemberId = body.inviter_member_id;
        inviterSubscriptionId = currentCycle.id;
      }

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO guest_passes (
            id,
            organization_id,
            branch_id,
            code,
            member_name,
            phone,
            amount,
            inviter_member_id,
            inviter_subscription_id,
            expires_at
         ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
         )
         RETURNING id`,
        [
          uuidv4(),
          auth.organizationId,
          auth.branchId,
          code,
          memberName,
          body.phone || null,
          amount,
          inviterMemberId,
          inviterSubscriptionId,
          expiresAt.toISOString(),
        ]
      );

      return selectGuestPass(client, auth.organizationId, auth.branchId, inserted.rows[0].id);
    });

    return ok(created, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Inviting member needs an active subscription cycle" ||
        error.message === "Guest invite limit reached for this cycle")
    ) {
      return fail(error.message, 400);
    }
    return routeError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    await ensureGuestPassColumns();
    const body = (await request.json()) as {
      id?: string;
      mark_used?: boolean;
      void_pass?: boolean;
      converted_member_id?: string;
    };
    if (!body.id) return fail("Guest pass id is required", 400);

    const actions = [body.mark_used === true, body.void_pass === true, Boolean(body.converted_member_id)].filter(Boolean).length;
    if (actions !== 1) return fail("Exactly one guest pass action is required", 400);

    const updated = await withTransaction(async (client) => {
      if (body.converted_member_id) {
        const result = await client.query<{ id: string }>(
          `UPDATE guest_passes
              SET converted_member_id = $4,
                  converted_at = COALESCE(converted_at, NOW()),
                  used_at = COALESCE(used_at, NOW())
            WHERE id = $1
              AND organization_id = $2
              AND branch_id = $3
              AND voided_at IS NULL
          RETURNING id`,
          [body.id, auth.organizationId, auth.branchId, body.converted_member_id]
        );
        if (!result.rows[0]) throw new Error("Guest pass not found");
      } else if (body.void_pass) {
        const result = await client.query<{ id: string }>(
          `UPDATE guest_passes
              SET voided_at = COALESCE(voided_at, NOW())
            WHERE id = $1
              AND organization_id = $2
              AND branch_id = $3
              AND used_at IS NULL
              AND converted_member_id IS NULL
          RETURNING id`,
          [body.id, auth.organizationId, auth.branchId]
        );
        if (!result.rows[0]) {
          throw new Error("Only unused guest passes can be voided");
        }
      } else {
        const result = await client.query<{ id: string }>(
          `UPDATE guest_passes
              SET used_at = COALESCE(used_at, NOW())
            WHERE id = $1
              AND organization_id = $2
              AND branch_id = $3
              AND voided_at IS NULL
          RETURNING id`,
          [body.id, auth.organizationId, auth.branchId]
        );
        if (!result.rows[0]) throw new Error("Guest pass not found");
      }

      return selectGuestPass(client, auth.organizationId, auth.branchId, body.id!);
    });

    return ok(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Only unused guest passes can be voided") {
      return fail(error.message, 400);
    }
    if (error instanceof Error && error.message === "Guest pass not found") {
      return fail(error.message, 404);
    }
    return routeError(error);
  }
}
