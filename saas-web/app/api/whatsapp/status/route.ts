import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const rows = await query<{ value: unknown }>(
      `SELECT value
         FROM settings
        WHERE organization_id = $1
          AND branch_id = $2
          AND key = 'whatsapp_status'
        LIMIT 1`,
      [auth.organizationId, auth.branchId]
    );
    return ok(rows[0]?.value || { state: "disconnected" });
  } catch (error) {
    return routeError(error);
  }
}
