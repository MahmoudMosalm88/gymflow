import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { updatePtSession } from "@/lib/pt";
import { ptSessionPatchSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    const payload = ptSessionPatchSchema.parse(await request.json());

    if (auth.role === "trainer" && payload.trainer_staff_user_id && payload.trainer_staff_user_id !== auth.staffUserId) {
      return fail("Trainers cannot move sessions to another trainer.", 403);
    }

    const data = await updatePtSession({
      organizationId: auth.organizationId,
      branchId: auth.branchId,
      sessionId: id,
      actorType: auth.actorType,
      actorId: auth.actorId,
      role: auth.role,
      trainerStaffUserId: auth.staffUserId,
      scheduledStart: payload.scheduled_start,
      scheduledEnd: payload.scheduled_end,
      durationMinutes: payload.duration_minutes,
      status: payload.status,
      notes: payload.notes,
    });
    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}
