import { NextRequest } from "next/server";
import { PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";
import { requireRoles } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { ok, routeError } from "@/lib/http";
import { upsertSetting } from "@/lib/tenant";
import { branchCreateSchema, branchPatchSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BranchRow = {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  created_at: string;
  is_current: boolean;
};

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

async function assertNoDuplicateBranchName(
  client: PoolClient,
  organizationId: string,
  name: string,
  excludeBranchId?: string
) {
  const duplicate = await client.query<{ id: string }>(
    `SELECT id
       FROM branches
      WHERE organization_id = $1
        AND LOWER(name) = LOWER($2)
        AND ($3::uuid IS NULL OR id <> $3::uuid)
      LIMIT 1`,
    [organizationId, name, excludeBranchId || null]
  );

  if (duplicate.rows[0]) {
    throw httpError("A branch with this name already exists.", 409);
  }
}

async function insertDefaultBranchSettings(
  client: PoolClient,
  organizationId: string,
  branchId: string,
  sourceBranchId: string
) {
  await client.query(
    `INSERT INTO settings (organization_id, branch_id, key, value, updated_at)
     SELECT $1::uuid, $2::uuid, defaults.key, defaults.value, NOW()
       FROM (
         VALUES
           ('pt_session_default_minutes', '60'::jsonb),
           ('pt_no_show_deducts', 'true'::jsonb),
           ('pt_late_cancel_deducts', 'true'::jsonb),
           ('pt_low_balance_threshold_sessions', '2'::jsonb),
           ('pt_expiry_warning_days', '3'::jsonb),
           ('pt_reminder_hours_before', '24'::jsonb),
           ('onboarding_completed', 'true'::jsonb),
           ('onboarding_mode', '"branch_management"'::jsonb)
       ) AS defaults(key, value)
     ON CONFLICT (organization_id, branch_id, key) DO NOTHING`,
    [organizationId, branchId]
  );

  await upsertSetting(client, organizationId, branchId, "branch_created_from_management_at", new Date().toISOString());

  const sourceSettings = await client.query<{ key: string; value: unknown }>(
    `SELECT key, value
       FROM settings
      WHERE organization_id = $1
        AND branch_id = $2
        AND key IN ('system_language', 'scan_cooldown_seconds', 'offline_max_age_hours')
      ORDER BY key ASC`,
    [organizationId, sourceBranchId]
  );

  for (const row of sourceSettings.rows) {
    await upsertSetting(client, organizationId, branchId, row.key, row.value);
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner"]);
    if (!auth.ownerId) throw httpError("Owner account is required.", 403);

    const rows = await query<BranchRow>(
      `SELECT b.id,
              b.name,
              b.timezone,
              b.currency,
              b.created_at::text,
              (b.id = $3::uuid) AS is_current
         FROM owner_branch_access oba
         JOIN branches b ON b.id = oba.branch_id
        WHERE oba.owner_id = $1
          AND b.organization_id = $2
        ORDER BY b.created_at ASC, b.name ASC`,
      [auth.ownerId, auth.organizationId, auth.branchId]
    );

    return ok(rows);
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner"]);
    if (!auth.ownerId) throw httpError("Owner account is required.", 403);
    const payload = branchCreateSchema.parse(await request.json());

    const created = await withTransaction(async (client) => {
      await assertNoDuplicateBranchName(client, auth.organizationId, payload.name);

      const source = await client.query<{ timezone: string; currency: string }>(
        `SELECT timezone, currency
           FROM branches
          WHERE id = $1
            AND organization_id = $2
          LIMIT 1`,
        [auth.branchId, auth.organizationId]
      );

      const sourceBranch = source.rows[0];
      if (!sourceBranch) throw httpError("Current branch was not found.", 404);

      const branchId = uuidv4();
      const inserted = await client.query<BranchRow>(
        `INSERT INTO branches (id, organization_id, name, timezone, currency)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, timezone, currency, created_at::text, false AS is_current`,
        [branchId, auth.organizationId, payload.name, sourceBranch.timezone, sourceBranch.currency]
      );

      await client.query(
        `INSERT INTO owner_branch_access (owner_id, branch_id, role)
         VALUES ($1, $2, 'owner')
         ON CONFLICT (owner_id, branch_id) DO NOTHING`,
        [auth.ownerId, branchId]
      );

      await insertDefaultBranchSettings(client, auth.organizationId, branchId, auth.branchId);

      return inserted.rows[0];
    });

    return ok(created, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner"]);
    if (!auth.ownerId) throw httpError("Owner account is required.", 403);
    const payload = branchPatchSchema.parse(await request.json());

    const updated = await withTransaction(async (client) => {
      const access = await client.query<{ id: string }>(
        `SELECT b.id
           FROM branches b
           JOIN owner_branch_access oba ON oba.branch_id = b.id
          WHERE b.id = $1
            AND b.organization_id = $2
            AND oba.owner_id = $3
          LIMIT 1`,
        [payload.id, auth.organizationId, auth.ownerId]
      );

      if (!access.rows[0]) {
        throw httpError("Branch was not found.", 404);
      }

      await assertNoDuplicateBranchName(client, auth.organizationId, payload.name, payload.id);

      const rows = await client.query<BranchRow>(
        `UPDATE branches
            SET name = $1
          WHERE id = $2
            AND organization_id = $3
          RETURNING id,
                    name,
                    timezone,
                    currency,
                    created_at::text,
                    (id = $4::uuid) AS is_current`,
        [payload.name, payload.id, auth.organizationId, auth.branchId]
      );

      return rows.rows[0];
    });

    return ok(updated);
  } catch (error) {
    return routeError(error);
  }
}
