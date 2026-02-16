import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const rows = await query(
      `SELECT b.id,
              b.source,
              b.status,
              b.storage_path,
              b.metadata,
              b.created_at,
              a.id AS artifact_id
         FROM backups b
         LEFT JOIN backup_artifacts a ON a.backup_id = b.id
        WHERE b.organization_id = $1
          AND b.branch_id = $2
        ORDER BY b.created_at DESC
        LIMIT 200`,
      [auth.organizationId, auth.branchId]
    );

    return ok(rows);
  } catch (error) {
    return routeError(error);
  }
}
