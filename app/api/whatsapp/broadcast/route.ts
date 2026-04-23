import { NextRequest } from "next/server";
import { requireRoles } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { createBroadcastCampaign } from "@/lib/whatsapp-ops";
import { whatsappBroadcastSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner"]);
    const body = whatsappBroadcastSchema.parse(await request.json());
    const title = body.title.trim();
    const message = body.message.trim();
    if (!title || !message) return fail("Title and message are required", 400);

    const data = await createBroadcastCampaign({
      organizationId: auth.organizationId,
      branchId: auth.branchId,
      ownerId: auth.ownerId!,
      title,
      message,
      filters: body.filters,
    });

    return ok(data, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("already running")) {
      return fail(error.message, 409);
    }
    return routeError(error);
  }
}
