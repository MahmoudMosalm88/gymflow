import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const raw = (rows[0]?.value || { state: "disconnected" }) as {
      state?: string;
      phone?: string;
      qrCode?: string;
    };
    return ok({
      connected: raw.state === "connected",
      state: raw.state || "disconnected",
      phone: raw.phone,
      qrCode: raw.qrCode,
    });
  } catch (error) {
    return routeError(error);
  }
}
