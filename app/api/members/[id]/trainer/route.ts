import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { assignTrainerToMember, getMemberTrainerAssignment, trainerHasMemberAccess } from "@/lib/trainers";
import { trainerAssignmentSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;

    if (auth.role === "trainer") {
      const allowed = await trainerHasMemberAccess({
        organizationId: auth.organizationId,
        branchId: auth.branchId,
        trainerStaffUserId: auth.staffUserId!,
        memberId: id,
      });
      if (!allowed) return fail("Member not found", 404);
    }

    const data = await getMemberTrainerAssignment(auth.organizationId, auth.branchId, id);
    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if (auth.role === "trainer") return fail("Forbidden", 403);

    const { id } = await context.params;
    const payload = trainerAssignmentSchema.parse(await request.json());
    const data = await assignTrainerToMember({
      organizationId: auth.organizationId,
      branchId: auth.branchId,
      memberId: id,
      trainerStaffUserId: payload.trainer_staff_user_id,
      assignedByActorType: auth.actorType,
      assignedByActorId: auth.actorId,
    });

    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}
