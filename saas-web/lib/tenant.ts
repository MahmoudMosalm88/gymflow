import { PoolClient } from "pg";
import { query } from "./db";

export async function upsertSetting(
  client: PoolClient,
  organizationId: string,
  branchId: string,
  key: string,
  value: unknown
) {
  await client.query(
    `INSERT INTO settings (organization_id, branch_id, key, value)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (organization_id, branch_id, key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [organizationId, branchId, key, JSON.stringify(value)]
  );
}

export async function getSetting(
  organizationId: string,
  branchId: string,
  key: string
): Promise<string | null> {
  const rows = await query<{ value: unknown }>(
    `SELECT value FROM settings WHERE organization_id = $1 AND branch_id = $2 AND key = $3 LIMIT 1`,
    [organizationId, branchId, key]
  );
  if (!rows[0]) return null;
  const v = rows[0].value;
  return typeof v === "string" ? v : v != null ? JSON.stringify(v) : null;
}
