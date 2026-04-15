import { NextRequest } from "next/server";
import { requireRoles } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { getTrainerPerformanceStats } from "@/lib/pt-performance";
import type { PerformanceResult } from "@/lib/pt-performance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner", "manager"]);
    const url = new URL(request.url);
    const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") || 30)));
    const now = Math.floor(Date.now() / 1000);
    const from = now - days * 86400;

    const data: PerformanceResult = await getTrainerPerformanceStats(
      auth.organizationId,
      auth.branchId,
      from,
      now
    );
    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}
