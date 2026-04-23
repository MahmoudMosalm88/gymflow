import { NextRequest } from "next/server";
import { fail, ok, routeError } from "@/lib/http";
import { getStaffInviteByToken } from "@/lib/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const invite = await getStaffInviteByToken(token);
    if (!invite) return fail("Invite not found.", 404);
    return ok({
      token: invite.token,
      phone: invite.phone,
      status: invite.status,
      expiresAt: invite.expires_at,
      acceptedAt: invite.accepted_at,
      staff: {
        id: invite.staff_user_id,
        name: invite.staff_name,
        email: invite.staff_email,
        role: invite.role,
      },
      organization: {
        id: invite.organization_id,
        name: invite.organization_name,
      },
      branch: {
        id: invite.branch_id,
        name: invite.branch_name,
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
