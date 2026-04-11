import { NextRequest } from "next/server";
import { requireRoles } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { createStaffUserAndInvite, listStaffUsers } from "@/lib/staff";
import { staffCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner"]);
    const data = await listStaffUsers(auth.organizationId, auth.branchId);
    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner"]);
    const payload = staffCreateSchema.parse(await request.json());
    const created = await createStaffUserAndInvite({
      organizationId: auth.organizationId,
      branchId: auth.branchId,
      name: payload.name,
      title: payload.title || null,
      phone: payload.phone,
      email: payload.email || null,
      role: payload.role,
    });

    return ok(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "STAFF_ALREADY_EXISTS") {
      return fail("A team member with this phone or email already exists.", 409);
    }
    return routeError(error);
  }
}
