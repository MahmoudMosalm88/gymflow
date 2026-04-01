import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { retryQueueItems } from "@/lib/whatsapp-ops";
import { whatsappQueueRetrySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = whatsappQueueRetrySchema.parse(await request.json().catch(() => ({})));
    const data = await retryQueueItems(auth.organizationId, auth.branchId, body.ids);
    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}
