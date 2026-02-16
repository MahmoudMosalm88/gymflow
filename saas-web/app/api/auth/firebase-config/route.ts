import { getFirebaseWebConfig } from "@/lib/env";
import { fail, ok } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const config = getFirebaseWebConfig();
  if (!config) {
    return fail("Firebase web client is not configured", 500);
  }

  return ok(config);
}
