import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { trainerHasMemberAccess } from "@/lib/trainers";
import { createPtSession, listBranchPtSessions, listMemberPtSessions, listTrainerPtSessions } from "@/lib/pt";
import { fail, ok, routeError } from "@/lib/http";
import { ptSessionCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const url = new URL(request.url);
    const memberId = url.searchParams.get("member_id");
    const trainerId = url.searchParams.get("trainer_id");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (memberId) {
      if (auth.role === "trainer") {
        const allowed = await trainerHasMemberAccess({
          organizationId: auth.organizationId,
          branchId: auth.branchId,
          trainerStaffUserId: auth.staffUserId || "",
          memberId,
        });
        if (!allowed) return fail("You do not have access to this client.", 403);
      }
      const data = await listMemberPtSessions(auth.organizationId, auth.branchId, memberId);
      return ok(data);
    }

    const effectiveTrainerId = auth.role === "trainer" ? auth.staffUserId : trainerId;
    const data = effectiveTrainerId
      ? await listTrainerPtSessions({
          organizationId: auth.organizationId,
          branchId: auth.branchId,
          trainerStaffUserId: effectiveTrainerId || "",
          from,
          to,
        })
      : await listBranchPtSessions({
          organizationId: auth.organizationId,
          branchId: auth.branchId,
          from,
          to,
        });
    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const payload = ptSessionCreateSchema.parse(await request.json());

    if (auth.role === "trainer" && auth.staffUserId !== payload.trainer_staff_user_id) {
      return fail("Trainers can only book sessions for themselves.", 403);
    }

    if (auth.role === "trainer") {
      const allowed = await trainerHasMemberAccess({
        organizationId: auth.organizationId,
        branchId: auth.branchId,
        trainerStaffUserId: auth.staffUserId || "",
        memberId: payload.member_id,
      });
      if (!allowed) return fail("You do not have access to this client.", 403);
    }

    const data = await createPtSession({
      organizationId: auth.organizationId,
      branchId: auth.branchId,
      packageId: payload.package_id,
      memberId: payload.member_id,
      trainerStaffUserId: payload.trainer_staff_user_id,
      createdByActorType: auth.actorType,
      createdByActorId: auth.actorId,
      scheduledStart: payload.scheduled_start,
      scheduledEnd: payload.scheduled_end ?? null,
      durationMinutes: payload.duration_minutes ?? null,
      notes: payload.notes ?? null,
    });
    return ok(data, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
