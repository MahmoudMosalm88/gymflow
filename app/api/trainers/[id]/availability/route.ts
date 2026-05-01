import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { getTrainerAvailability, replaceTrainerAvailability } from "@/lib/pt";
import { trainerAvailabilityPutSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    if (auth.role === "trainer" && auth.staffUserId !== id) {
      return fail("You do not have access to this trainer availability.", 403);
    }

    const data = await getTrainerAvailability(auth.organizationId, auth.branchId, id);
    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    if (auth.role === "staff") {
      return fail("Staff cannot change trainer availability.", 403);
    }
    if (auth.role === "trainer" && auth.staffUserId !== id) {
      return fail("You do not have access to this trainer availability.", 403);
    }

    const payload = trainerAvailabilityPutSchema.parse(await request.json());
    const data = await replaceTrainerAvailability({
      organizationId: auth.organizationId,
      branchId: auth.branchId,
      trainerStaffUserId: id,
      slots: payload.slots,
    });
    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}
