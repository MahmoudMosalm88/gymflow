import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { getQueueItems } from "@/lib/whatsapp-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const search = request.nextUrl.searchParams;
    const status = search.get("status") || "all";
    const limit = Number(search.get("limit") || 20);

    const data = await getQueueItems(auth.organizationId, auth.branchId, {
      status: status as "all" | "pending" | "processing" | "sent" | "failed",
      limit,
    });

    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}
