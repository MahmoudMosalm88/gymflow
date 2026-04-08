import { ok } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Keep Cloud Run startup/liveness checks focused on process health.
  // Database saturation during rollout should not prevent a new revision
  // from starting and serving once connection pressure drops.
  return ok({ status: "ok" });
}
