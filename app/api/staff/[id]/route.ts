import { NextRequest } from "next/server";
import { requireRoles } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { patchStaffUser } from "@/lib/staff";
import { staffPatchSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRoles(request, ["owner"]);
    const { id } = await context.params;
    const payload = staffPatchSchema.parse(await request.json());
    if (payload.is_active === undefined && payload.resend_invite !== true) {
      return fail("Nothing to update.", 400);
    }

    const data = await patchStaffUser({
      organizationId: auth.organizationId,
      branchId: auth.branchId,
      staffUserId: id,
      isActive: payload.is_active,
      resendInvite: payload.resend_invite,
      replacementTrainerStaffUserId: payload.replacement_trainer_staff_user_id,
    });
    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}
