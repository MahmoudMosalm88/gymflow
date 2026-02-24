import { NextRequest } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { upsertSetting, getSetting } from "@/lib/tenant";
import { maybeCreateDedupedSystemNotification } from "@/lib/notifications";

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

    const lang = await getSetting(auth.organizationId, auth.branchId, "system_language");
    const isAr = lang === "ar";

    await maybeCreateDedupedSystemNotification(
      {
        dedupeKey: `whatsapp_connecting:${auth.organizationId}:${auth.branchId}`,
        dedupeWindowMinutes: 15,
        type: "whatsapp_connecting",
        title: isAr ? "بدأ الاتصال بواتساب" : "WhatsApp connection started",
        body: isAr ? "امسح رمز QR في الإعدادات لإكمال ربط حساب واتساب." : "Scan the QR code in Settings to finish linking your WhatsApp account.",
        severity: "info",
        actionUrl: "/dashboard/settings",
      },
      [{ organizationId: auth.organizationId, branchId: auth.branchId }]
    );

    return ok({ state: "connecting" });
  } catch (error) {
    return routeError(error);
  }
}
