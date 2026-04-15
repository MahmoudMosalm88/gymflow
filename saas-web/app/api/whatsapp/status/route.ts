import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { getWhatsAppCompatibilityAudit, getWhatsAppStatusWithQueue } from "@/lib/whatsapp-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const [status, compatibilityAudit] = await Promise.all([
      getWhatsAppStatusWithQueue(auth.organizationId, auth.branchId),
      getWhatsAppCompatibilityAudit(auth.organizationId, auth.branchId, auth.ownerId),
    ]);
    return ok({ ...status, compatibilityAudit });
  } catch (error) {
    return routeError(error);
  }
}
