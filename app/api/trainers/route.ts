import { NextRequest } from "next/server";
import { requireRoles } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { listTrainerProfiles } from "@/lib/trainers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner", "manager", "staff"]);
    const data = await listTrainerProfiles(auth.organizationId, auth.branchId);
    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}
