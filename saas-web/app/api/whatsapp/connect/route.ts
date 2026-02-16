import { NextRequest } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { upsertSetting } from "@/lib/tenant";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    await withTransaction(async (client) => {
      await upsertSetting(client, auth.organizationId, auth.branchId, "whatsapp_status", {
        state: "connecting",
        requested_at: new Date().toISOString()
      });
    });

    return ok({ state: "connecting" });
  } catch (error) {
    return routeError(error);
  }
}
