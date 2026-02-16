import { PoolClient } from "pg";

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
