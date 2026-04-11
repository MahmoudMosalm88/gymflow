import { NextRequest } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import { fail, ok, routeError } from "@/lib/http";
import { acceptStaffInvite } from "@/lib/staff";
import { staffAcceptInviteSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = staffAcceptInviteSchema.parse(await request.json());
    const auth = getFirebaseAdminAuth();
    if (!auth) return fail("Firebase admin is not configured correctly.", 500);

    const decoded = await auth.verifyIdToken(payload.idToken);
    const phone = typeof decoded.phone_number === "string" ? decoded.phone_number : "";
    if (!phone) {
      return fail("Invite acceptance requires a verified phone number.", 400);
    }

    const accepted = await acceptStaffInvite({
      token: payload.token,
      firebaseUid: decoded.uid,
      phone,
    });

    return ok({
      message: "Invite accepted",
      owner: accepted.profile,
      user: accepted.profile,
      session: {
        idToken: payload.idToken,
        branchId: accepted.access.branch_id,
        organizationId: accepted.access.organization_id,
        ownerId: accepted.access.owner_id,
        actorId: accepted.access.actor_id,
        actorType: accepted.access.actor_type,
        role: accepted.access.role,
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
