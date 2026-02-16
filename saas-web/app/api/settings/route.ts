import { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { settingsPutSchema } from "@/lib/validation";
import { upsertSetting } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const rows = await query<{ key: string; value: unknown }>(
      `SELECT key, value
         FROM settings
        WHERE organization_id = $1
          AND branch_id = $2
        ORDER BY key ASC`,
      [auth.organizationId, auth.branchId]
    );

    const output = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return ok(output);
  } catch (error) {
    return routeError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const payload = settingsPutSchema.parse(await request.json());

    await withTransaction(async (client) => {
      for (const [key, value] of Object.entries(payload.values)) {
        await upsertSetting(client, auth.organizationId, auth.branchId, key, value);
      }
    });

    return ok({ updatedKeys: Object.keys(payload.values) });
  } catch (error) {
    return routeError(error);
  }
}
