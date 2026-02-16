import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    const artifactId = String(body.artifactId || "");
    if (!artifactId) return fail("artifactId is required", 400);

    const rows = await query<{ payload: Record<string, unknown> }>(
      `SELECT payload
         FROM import_artifacts
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
        LIMIT 1`,
      [artifactId, auth.organizationId, auth.branchId]
    );

    if (!rows[0]) return fail("Artifact not found", 404);

    const payload = rows[0].payload;
    const members = Array.isArray(payload.members) ? payload.members.length : 0;
    const subscriptions = Array.isArray(payload.subscriptions) ? payload.subscriptions.length : 0;
    const schemaVersion = typeof payload.schemaVersion === "string" ? payload.schemaVersion : "unknown";

    const isValid = members >= 0 && subscriptions >= 0;

    await query(
      `UPDATE import_artifacts
          SET status = $4,
              validation_report = $5::jsonb,
              updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3`,
      [
        artifactId,
        auth.organizationId,
        auth.branchId,
        isValid ? "validated" : "invalid",
        JSON.stringify({ schemaVersion, members, subscriptions, isValid })
      ]
    );

    return ok({ schemaVersion, members, subscriptions, isValid });
  } catch (error) {
    return routeError(error);
  }
}
