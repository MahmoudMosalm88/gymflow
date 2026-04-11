import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listTrainerPtSessions } from "@/lib/pt";
import { ok, fail, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    const { id: trainerId } = await context.params;

    if (auth.role === "trainer" && auth.staffUserId !== trainerId) {
      return fail("Access denied.", 403);
    }

    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const data = await listTrainerPtSessions({
      organizationId: auth.organizationId,
      branchId: auth.branchId,
      trainerStaffUserId: trainerId,
      from,
      to,
    });
    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}
