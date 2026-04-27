import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRoles } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import type { DesktopImportJobStatusResponse } from "@/lib/migration-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner"]);
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");

    if (!jobId) return fail("jobId is required", 400);

    const rows = await query<DesktopImportJobStatusResponse>(
      `SELECT id, type, status, payload, result, started_at, finished_at
         FROM migration_jobs
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
        LIMIT 1`,
      [jobId, auth.organizationId, auth.branchId]
    );

    if (!rows[0]) return fail("Job not found", 404);
    return ok(rows[0]);
  } catch (error) {
    return routeError(error);
  }
}
