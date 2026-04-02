import type { PoolClient } from "pg";
import { query } from "@/lib/db";

type Queryable = Pick<PoolClient, "query">;

export async function deactivateExpiredSubscriptions(
  organizationId: string,
  branchId: string,
  now: number,
  client?: Queryable
) {
  const executor = client ?? { query: (text: string, values?: unknown[]) => query(text, values) };
  await executor.query(
    `UPDATE subscriptions
        SET is_active = false
      WHERE organization_id = $1
        AND branch_id = $2
        AND is_active = true
        AND end_date < $3`,
    [organizationId, branchId, now]
  );
}
