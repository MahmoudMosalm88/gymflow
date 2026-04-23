import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { previewBroadcast } from "@/lib/whatsapp-ops";
import { whatsappBroadcastSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = whatsappBroadcastSchema.parse(await request.json());
    const data = await previewBroadcast(auth.organizationId, auth.branchId, body.filters);
    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}
