import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { getGuestInviteSummary } from "@/lib/guest-invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    const summary = await getGuestInviteSummary(auth.organizationId, auth.branchId, params.id);
    if (!summary) return fail("Member not found", 404);
    return ok(summary);
  } catch (error) {
    return routeError(error);
  }
}
