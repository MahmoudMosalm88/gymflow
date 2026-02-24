import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GuestPassRow = {
  id: string;
  code: string;
  member_name: string;
  phone: string | null;
  amount: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

function generateCode() {
  return `GP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// Auto-migrate: add amount column if missing
async function ensureAmountColumn() {
  await query(`ALTER TABLE guest_passes ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2)`);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    await ensureAmountColumn();
    const rows = await query<GuestPassRow>(
      `SELECT id, code, member_name, phone, amount, expires_at, used_at, created_at
         FROM guest_passes
        WHERE organization_id = $1
          AND branch_id = $2
        ORDER BY created_at DESC
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
    await ensureAmountColumn();
    const body = await request.json() as {
      member_name?: string;
      phone?: string;
      amount?: number;
      expires_at?: string;
    };

    const memberName = String(body.member_name || "").trim();
    if (memberName.length < 2) return fail("Guest name is required", 400);

    const amount = body.amount != null ? Number(body.amount) : null;
    if (amount != null && (isNaN(amount) || amount < 0)) return fail("Invalid amount", 400);

    const expiresAt = body.expires_at ? new Date(body.expires_at) : new Date(Date.now() + 24 * 3600 * 1000);
    if (Number.isNaN(expiresAt.getTime())) return fail("Invalid expiry date", 400);

    const code = generateCode();
    const rows = await query<GuestPassRow>(
      `INSERT INTO guest_passes (
          id, organization_id, branch_id, code, member_name, phone, amount, expires_at
       ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
       )
       RETURNING id, code, member_name, phone, amount, expires_at, used_at, created_at`,
      [uuidv4(), auth.organizationId, auth.branchId, code, memberName, body.phone || null, amount, expiresAt.toISOString()]
    );

    return ok(rows[0], { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    await ensureAmountColumn();
    const body = await request.json() as { id?: string; mark_used?: boolean };
    if (!body.id) return fail("Guest pass id is required", 400);

    const rows = await query<GuestPassRow>(
      `UPDATE guest_passes
          SET used_at = CASE WHEN $4 THEN NOW() ELSE used_at END
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
      RETURNING id, code, member_name, phone, amount, expires_at, used_at, created_at`,
      [body.id, auth.organizationId, auth.branchId, body.mark_used === true]
    );

    if (!rows[0]) return fail("Guest pass not found", 404);
    return ok(rows[0]);
  } catch (error) {
    return routeError(error);
  }
}
