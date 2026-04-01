import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { getCampaignItems } from "@/lib/whatsapp-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const limit = Number(request.nextUrl.searchParams.get("limit") || 20);
    const items = await getCampaignItems(auth.organizationId, auth.branchId, limit);
    return ok({ items });
  } catch (error) {
    return routeError(error);
  }
}
