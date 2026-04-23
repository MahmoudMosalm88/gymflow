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
        state: "disconnected",
        requested_at: new Date().toISOString()
      });
    });

    const lang = await getSetting(auth.organizationId, auth.branchId, "system_language");
    const isAr = lang === "ar";

    await maybeCreateDedupedSystemNotification(
      {
        dedupeKey: `whatsapp_disconnected:${auth.organizationId}:${auth.branchId}`,
        dedupeWindowMinutes: 15,
        type: "whatsapp_disconnected",
        title: isAr ? "تم قطع اتصال واتساب" : "WhatsApp disconnected",
        body: isAr ? "تم إيقاف رسائل واتساب التلقائية مؤقتاً حتى تعيد الاتصال." : "Automatic WhatsApp messages are paused until you reconnect.",
        severity: "warning",
        actionUrl: "/dashboard/settings",
      },
      [{ organizationId: auth.organizationId, branchId: auth.branchId }]
    );

    return ok({ state: "disconnected" });
  } catch (error) {
    return routeError(error);
  }
}
